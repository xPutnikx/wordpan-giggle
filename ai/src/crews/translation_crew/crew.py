from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
from src.crews.base.llm import DEFAULT_LLM
from src.crews.translation_crew.schemas import TranslationSuggestionsOutput

@CrewBase
class TranslationCrew():
    agents: List[BaseAgent]
    tasks: List[Task]

    @agent
    def translation_expert(self) -> Agent:
        return Agent(
            config=self.agents_config['translation_expert'],
            llm=DEFAULT_LLM
        )

    @task
    def translation_suggestions_task(self) -> Task:
        return Task(
            config=self.tasks_config['translation_suggestions_task'],
            output_pydantic=TranslationSuggestionsOutput
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential
        )

