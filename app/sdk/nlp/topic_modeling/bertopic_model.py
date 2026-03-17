import logging
from typing import Optional

from bertopic import BERTopic
from numpy import ndarray

from astra.sdk.nlp.topic_modeling.base_topic_model import TopicModeler

logger = logging.getLogger(__name__)


class BERTopicModel(TopicModeler):
    """
    Topic modeling implementation using BERTopic.
    Provides methods for training, updating, transforming, and retrieving topics from tokenized text corpora using BERTopic.

    Attributes:
        model (BERTopic): The BERTopic model instance.
    """

    def __init__(self,
                 embedding_model: str = 'all-MiniLM-L6-v2',
                 verbose: bool = False,
                 **kwargs):
        """
        Initializes a BERTopicModel instance with the specified embedding model and verbosity.

        Args:
            embedding_model (str): Name of the embedding model to use for topic modeling. Default to 'all-MiniLM-L6-v2'
            verbose (bool): Whether to enable verbose output during model operations. Default to False
            **kwargs (any): Additional keyword arguments passed to the BERTopic constructor.
        """
        self.model = BERTopic(
            embedding_model=embedding_model,
            verbose=verbose,
            **kwargs)
        self._topics: dict[int, list[str]] = {}

    def train(self, corpus: list[list[str]]) -> None:
        """
        Trains the topic model on the provided corpus.

        Args:
            corpus (list[list[str]]): A list of documents, each represented as a list of tokens.
        """
        texts_raw = [' '.join(doc) for doc in corpus]
        texts = [t for t in texts_raw if t and t.strip()]
        if not texts:
            logger.warning('BERTopicModel.train: empty text corpus. Skipping training.')
            self._topics = {}
            return
        try:
            topics, probs = self.model.fit_transform(texts)
        except ValueError as e:
            logger.error(f'BERTopicModel.train failed (UMAP error): {e}')
            self._topics = {}
            return
        valid_topics = set([tid for tid in topics if tid is not None])
        self._topics = {tid: [word for word, _ in self.model.get_topic(tid)] for tid in valid_topics}
        logger.info(f"BERTopic trained: {len(self._topics)} topics.")

    def update(self, new_docs: list[list[str]]) -> list[Optional[int]]:
        """
        Updates the topic model with new documents.

        Args:
            new_docs (list[list[str]]): A list of new documents, each represented as a list of tokens.

        Returns:
            (list[Optional[int]]): Topic assignments for each new document, or None if the model is not trained.
        """
        if not hasattr(self.model, 'transform'):
            logger.error('BERTopicModel.update called before model training.')
            return [None] * len(new_docs)

        texts = [' '.join(doc) for doc in new_docs]
        topics, _ = self.model.transform(texts)
        try:
            self.model.update_topics(texts, topics)
        except Exception as e:
            logger.error(f'BERTopicModel.update failed: {e}')

        return [tid for tid in topics]

    def transform(self, corpus: list[list[str]]) -> tuple[list[Optional[int]], ndarray]:
        """
        Transforms the given corpus into topic assignments and associated confidence scores.

        Args:
            corpus (list[list[str]]): A list of documents, each represented as a list of tokens.

        Returns:
             (tuple[list[Optional[int]], ndarray]): A tuple containing topic assignments and confidence scores for each document.
        """
        if not hasattr(self.model, 'transform'):
            logger.error('BERTopicModel.transform called before model training.')
            return [], ndarray([])

        texts = [' '.join(doc) for doc in corpus]
        topics, probs = self.model.transform(texts)
        clean_topics = [tid for tid in topics]
        return clean_topics, probs

    def get_topics(self) -> dict[int, list[str]]:
        """
        Retrieves the topics discovered by the model.

        Returns:
             (dict[int, list[str]]): A mapping from topic IDs to lists of representative terms for each topic.
        """
        return self._topics.copy()
