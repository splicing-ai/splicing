from string import Template

import yaml


class PromptManager:
    def __init__(self, file_path: str) -> None:
        with open(file_path) as file:
            self.prompts = yaml.safe_load(file)

    def get_prompt(self, *args, **kwargs) -> str:
        template = self.prompts
        for arg in args:
            if arg in template:
                template = template[arg]
            else:
                return ""
        return Template(template).safe_substitute(**kwargs)
