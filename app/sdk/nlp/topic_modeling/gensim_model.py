import logging
from typing import Optional

from gensim.corpora import Dictionary
from gensim.models import LdaModel, Phrases
from gensim.models.phrases import Phraser

from astra.sdk.nlp.topic_modeling.base_topic_model import TopicModeler

logger = logging.getLogger(__name__)


class GensimTopicModel(TopicModeler):
    """
    Topic modeling implementation using Gensim's LDA.

    Attributes:
        num_topics (int, optional): Number of topics to generate. Default is 10.
        passes (int, optional): Number of passes through the corpus during training. Default is 10.
        random_state (int, optional): Random seed for reproducibility. Default is None.
    """

    def __init__(self,
                 num_topics: int = 10,
                 passes: int = 10,
                 random_state: int = None,
                 topn: int = 10):
        """
        Initializes the topic modeling using Gensim's LDA, extending the TopicModeler interface.
        Provides methods to train, update, and transform documents into topic assignments and confidence scores,
        as well as retrieve discovered topics. Supports configurable number of topics, training passes, and random state.
        """
        self.num_topics = num_topics
        self.passes = passes
        self.random_state = random_state
        self.topn = topn
        self.dictionary: Optional[Dictionary] = None
        self.model: Optional[LdaModel] = None
        self.bigrams: Optional[Phraser] = None
        self.trigrams: Optional[Phraser] = None
        self.corpus: list[list[tuple[int, int]]] = []

    def train(self, corpus: list[list[str]]) -> None:
        """
        Trains the topic model on the provided corpus.

        Args:
            corpus (list[list[str]]): list[list[str]]: A list of documents, each represented as a list of tokens.
        """
        normalized = []
        tokens = None
        for doc in corpus:
            if isinstance(doc, str):
                tokens = doc.split()
            elif isinstance(doc, list):
                tokens = doc
            else:
                logger.warning(f'GensimTopicModel.train: unknown document type: {doc}')
                continue
            if tokens:
                normalized.append(tokens)

        if not normalized:
            logger.warning('GensimTopicModel.train: after normalization, no tokens found. Skipping training.')

        bigrams_model = Phrases(normalized, min_count=2, threshold=10)
        trigrams_model = Phrases(bigrams_model[normalized], min_count=2, threshold=10)

        self.bigrams = Phraser(bigrams_model)
        self.trigrams = Phraser(trigrams_model)

        corpus_with_phrases = [self.trigrams[self.bigrams[doc]] for doc in normalized]

        self.dictionary = Dictionary(corpus_with_phrases)
        self.dictionary.filter_extremes(no_above=0.8, no_below=2, keep_n=10000)
        if len(self.dictionary) == 0:
            self.dictionary = Dictionary(corpus_with_phrases)
            logger.warning("Dictionary is empty after filtering, reprocessing LDA training without filter")

        bow_corpus = [self.dictionary.doc2bow(doc) for doc in corpus_with_phrases]
        self.model = LdaModel(
            corpus=bow_corpus,
            id2word=self.dictionary,
            num_topics=self.num_topics,
            passes=self.passes,
            random_state=self.random_state)
        self.corpus = bow_corpus
        logger.info(f"Gensim LDA trained: {self.num_topics} topics.")

    def update(self, new_docs: list[list[str]]) -> list[Optional[int]]:
        """
        Updates the topic model with new documents.

        Args:
            new_docs (list[list[str]]): A list of new documents, each represented as a list of tokens.

        Returns:
             (list[Optional[int]]): Topic assignments for each new document, or None if assignment fails.
        """
        if not self.model or not self.dictionary:
            logger.error('GensimTopicModel.update called before model training.')
            return [None] * len(new_docs)

        new_bow = [self.dictionary.doc2bow(doc, allow_update=True) for doc in new_docs]
        try:
            self.model.update(new_bow)
        except Exception as e:
            logger.error(f'GensimTopicModel.update failed: {e}')
            return [None] * len(new_docs)

        topic_ids: list[Optional[int]] = []
        for bow in new_bow:
            topics = self.model.get_document_topics(bow)
            top_topic = max(topics, key=lambda x: x[1])[0] if topics else None
            topic_ids.append(top_topic)
        return topic_ids

    def transform(self, corpus: list[list[str]]) -> tuple[list[Optional[int]], list[float]]:
        """
        Transforms the given corpus into topic assignments and associated confidence scores.

        Args:
            corpus (list[list[str]]): A list of documents, each represented as a list of tokens.

        Returns:
             (tuple[list[Optional[int]], list[float]]): A tuple containing topic assignments and confidence scores for each document.
        """
        if not self.model or not self.dictionary:
            logger.error('GensimTopicModel.transform called before model training.')
            return [], []

        bow_corpus = [self.dictionary.doc2bow(doc) for doc in corpus]
        topic_ids: list[Optional[int]] = []
        probs: list[float] = []
        for bow in bow_corpus:
            topics = self.model.get_document_topics(bow)
            if topics:
                top_topic, top_prob = max(topics, key=lambda x: x[1])
            else:
                top_topic, top_prob = None, 0.0
            topic_ids.append(top_topic)
            probs.append(top_prob)
        return topic_ids, probs

    def get_topics(self) -> dict[int, list[str]]:
        """
        Retrieves the topics discovered by the model.

        Returns:
            (dict[int, list[str]]): A mapping from topic IDs to lists of representative terms for each topic.
                Returns an empty dictionary if the model is not trained.
        """
        if not self.model:
            logger.error('GensimTopicModel.get_topics called before model training.')
            return {}

        topics = {}
        for tid in range(self.num_topics):
            topics[tid] = [word for word, _ in self.model.show_topic(tid, topn=self.topn)]
        return topics
