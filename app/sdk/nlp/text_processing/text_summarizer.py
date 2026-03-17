import torch
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    GPT2Tokenizer,
    T5ForConditionalGeneration
)


class TextSummarizer:
    """
    Handles text summarization using transformer-based models.
    """

    def __init__(self):
        """Initializes a storage for loaded models to avoid reloading them multiple times"""
        self.loaded_models = {}

    def _load_model_for_language(self, lang: str) -> dict:
        """
        Loads the appropriate model and tokenizer for the specified language.

        Args:
            lang (str): Language of the text.

        Returns:
            (dict): A dictionary containing the tokenizer and model for the specified language.

        Raises:
            ValueError: If the language is not supported.
        """
        if lang in self.loaded_models:
            return self.loaded_models[lang]

        if lang == "ru":
            model_name = "RussianNLP/FRED-T5-Summarizer"
            tokenizer = GPT2Tokenizer.from_pretrained(model_name, eos_token='</s>')
            model = T5ForConditionalGeneration.from_pretrained(model_name)
        elif lang == "en":
            model_name = "facebook/bart-large-cnn"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        else:
            raise ValueError("Language error: use only 'ru' or 'en'")

        self.loaded_models[lang] = {"tokenizer": tokenizer, "model": model}

        return self.loaded_models[lang]

    def summarize(self, text: str, lang: str) -> str:
        """
        Generates a summary for the given text using the appropriate model.

        Args:
            text (str): The input text to summarize.
            lang (str): Language of the text.

        Returns:
            (str): The summarized text as a string.
        """
        model_info = self._load_model_for_language(lang)
        tokenizer = model_info["tokenizer"]
        model = model_info["model"]

        inputs = tokenizer(
            [text],
            max_length=600,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )

        with torch.no_grad():
            summary_ids = model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                no_repeat_ngram_size=4,
                num_beams=4,
                early_stopping=True,
            )

        return tokenizer.decode(summary_ids[0], skip_special_tokens=True)
