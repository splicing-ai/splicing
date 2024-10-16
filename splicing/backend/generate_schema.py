import os
import subprocess


def main():
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    generated_dir = os.path.join(curr_dir, "app", "generated")
    os.makedirs(generated_dir, exist_ok=True)
    subprocess.run(
        [
            "datamodel-codegen",
            "--input",
            os.path.join(curr_dir, "..", "schemas", "schema.yaml"),
            "--output",
            os.path.join(generated_dir, "schema.py"),
            "--target-python-version",
            "3.10",
            "--use-union-operator",
            "--strict-nullable",
            "--output-model-type",
            "pydantic_v2.BaseModel",
            "--use-standard-collections",
            "--collapse-root-models",
            "--use-double-quotes",
        ]
    )


if __name__ == "__main__":
    main()
