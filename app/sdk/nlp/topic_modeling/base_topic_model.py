from abc import ABC, abstractmethod


class TopicModeler(ABC):
    """
    Abstract base class for topic modeling algorithms.

    Defines the required interface for training, updating, transforming, and retrieving topics from a topic model.
    """

    @abstractmethod
    def train(self, corpus: list[list[str]]) -> None:
        """
        Trains the topic model on the provided corpus.

        Args:
            corpus (list[list[str]]): A list of documents, each represented as a list of tokens.
        """
        pass

    @abstractmethod
    def update(self, new_docs: list[list[str]]) -> list[int]:
        """
        Updates the topic model with new documents.

        Args:
            new_docs (list[list[str]]): A list of new documents, each represented as a list of tokens.

        Returns:
            (list[int]): Topic assignments for each new document.
        """
        pass

    @abstractmethod
    def transform(self, corpus: list[list[str]]) -> tuple[list[int], list[float]]:
        """
        Transforms the given corpus into topic assignments and associated confidence scores.

        Args:
            corpus (list[list[str]]): A list of documents, each represented as a list of tokens.

        Returns:
            (tuple[list[int], list[float]]): A tuple containing topic assignments and confidence scores for each document.
        """
        pass

    @abstractmethod
    def get_topics(self) -> dict[int, list[str]]:
        """
        Retrieves the topics discovered by the model.

        Returns:
            (dict[int, list[str]]): A mapping from topic IDs to lists of representative terms for each topic.
        """
        pass
