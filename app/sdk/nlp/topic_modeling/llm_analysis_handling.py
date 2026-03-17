import pandas as pd
import ollama


class LLMAnalysisHandler:
    """
    Handles Large Language Model (LLM) analysis and description generation for publication topic analysis results.

    This class integrates with the Llama model to provide natural language descriptions of topic modeling
    analysis results. It processes publication assignments data to identify trends, growth patterns, and
    provides comprehensive analysis summaries in Russian language.

    Attributes:
        model (Llama): The initialized Llama model instance for text generation.
    """

    def __init__(self, model):
        """
        Initializes the LLMAnalysisHandler with a Llama model.

        Sets up the Llama model with specified configuration parameters for text generation.
        The model is configured with a large context window and customizable threading options.

        Args:
            model (str):
                Name of the Llama model to use, as listed by `ollama list`.
                This can be a full HuggingFace model reference (e.g.,
                'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M') or a local
                alias created via `ollama create`.
        """

        self.model = model

    def describe_analysis(self, analyze_results: dict) -> str:
        """
        Generates a comprehensive Russian-language analysis description of topic modeling results.

        Creates a natural language summary by analyzing publication assignments data over time.
        The method calculates quarterly trends, identifies growing and declining topics, and
        provides insights about overall patterns across all discovered topics.

        Args:
            analyze_results (dict): Analysis results containing topic assignments and metadata.
                Expected keys: 'assignments' (list), 'topic_info' (dict).

                    - 'assignments': List of dicts with 'topic_id' and 'published_at' keys
                    - 'topic_info': Dictionary mapping topic IDs to topic information

        Returns:
            (str): Generated analysis description in Russian covering:

                - Growing topic themes
                - Declining topic themes
                - General trends across all topics
        """

        pivot = self._calculate_pivot(analyze_results['assignments'])

        prompt_case = f"""

        """

        prompt_system = """

        """

        response = ollama.chat(
            model=self.model,
            messages=[
                {'role': 'system', 'content': prompt_system},
                {'role': 'user', 'content': prompt_case}
            ]
        )

        first_response = response['message']['content']

        prompt_refresh = f"""


        Напоминаю прошлый ответ:
        {first_response}
        """

        response_refresh = ollama.chat(
            model=self.model,
            messages=[
                {'role': 'user', 'content': prompt_refresh}
            ]
        )

        return response_refresh['message']['content']

    @staticmethod
    def _calculate_pivot(assignments: list[dict]) -> pd.DataFrame:
        """
        Creates a pivot table showing topic distribution across quarterly time periods.

        Processes publication assignment data to create a matrix where rows represent quarters
        and columns represent topic IDs, with cell values indicating publication counts.
        This pivot table is used to analyze temporal trends in topic popularity.

        Args:
            assignments (list[dict]): List of assignment dictionaries containing:

                - 'topic_id': int or str: Identifier of the assigned topic
                - 'published_at': datetime or str: Publication date/timestamp

        Returns:
            (pd.DataFrame): Pivot table with:

                - Index: Quarter periods (e.g., '2023Q1', '2023Q2')
                - Columns: Topic IDs
                - Values: Count of publications per topic per quarter
                - Missing values filled with 0
        """

        rows = [
            {''}
            for assignment in assignments]
        df = pd.DataFrame(rows)


        counts = df.groupby(['quarter', 'topic_id']).size().reset_index(name='count')
        pivot = counts.pivot(index='quarter', columns='topic_id', values='count').fillna(0)

        return pivot
