from keybert import KeyBERT
import numpy as np
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer


class KeywordExtractor:
    """
    Keywords extractor class.
    """

    def __init__(self, num_clusters=5):
        """Initialize Bert model."""
        self.sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.kw_model = KeyBERT(model=self.sentence_model)
        self.num_clusters = num_clusters

    def extract_keywords(self, text: str, top_n=10) -> tuple:
        """
        Selecting Keywords with Bert.

        Args:
            text (str): Preprocessed input text from which to extract keywords.
            top_n (int): The number of top keywords/keyphrases to extract. Default to 10.

        Returns:
             (tuple): A list of extracted keywords or keyphrases.
        """
        keywords = self.kw_model.extract_keywords(text, top_n=top_n)

        embeddings = self.sentence_model.encode(text)
        embeddings_reshaped = np.array(embeddings)

        if embeddings_reshaped.ndim == 1:
            embeddings_reshaped = embeddings_reshaped.reshape(-1, 1)

        kmeans = KMeans(n_clusters=self.num_clusters, random_state=42)
        keywords_list = [kw for kw, _ in keywords]
        labels = kmeans.fit_predict(embeddings_reshaped)

        return keywords_list, labels
