import nltk

nltk.download("stopwords")
nltk.download("punkt_tab")
nltk.download("wordnet")
import re

import pymorphy3
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize


class TextProcessor:
    """
    Text processing class.
    """

    def __init__(self):
        self.stopwords_ru = set(stopwords.words("russian"))
        self.stopwords_en = set(stopwords.words("english"))
        self.lemmatizer_en = WordNetLemmatizer()
        self.morph = pymorphy3.MorphAnalyzer()

    def _detect_language(self, text: str) -> str:
        """
        Detects the language of the input text.


        Args:
            text (str): The raw input text to detecting language.

        Returns:
            (str): The detected language of the text ('ru' for Russian, 'en' for English).
        """
        return "ru" if re.search(r"[а-яА-ЯёЁ]", text) else "en"

    def _tokenize_and_clean(self, text: str, lang: str) -> list[str]:
        """
        Tokenizes the input text and cleans it.

        Args:
            text (str): The raw input text to be tokenized and cleaned.
            lang (str): The detected language of the text ('ru' for Russian, 'en' for English).

        Returns:
            (list[str]): A list of cleaned and lemmatized tokens.
        """
        text = text.lower()
        text = re.sub(r"[^а-яёa-z\s]", " ", text)
        tokens = word_tokenize(
            text, language="russian" if lang == "ru" else "english")

        if lang == "ru":
            return [
                self.morph.parse(t)[0].normal_form
                for t in tokens
                if t not in self.stopwords_ru and len(t) > 2
            ]
        else:
            return [
                self.lemmatizer_en.lemmatize(t)
                for t in tokens
                if t not in self.stopwords_en and len(t) > 2
            ]

    def process(self, text: str) -> dict:
        """
        Tokenizes and cleans the input text by removing stopwords and applying lemmatization.

        Args:
            text (str): The raw input text to be processed.

        Returns:
            (dict): A dictionary containing:

                - clean_text: The cleaned and lemmatized text as a single string.
                - tokens: A list of cleaned and lemmatized tokens.
                - language: The detected language of the text ('ru' for Russian, 'en' for English).
        """
        lang = self._detect_language(text)
        tokens = self._tokenize_and_clean(text, lang)
        return {"clean_text": " ".join(tokens), "tokens": tokens, "language": lang}
