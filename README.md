# SIH Chatbot: Your Smart India Hackathon Assistant

This is a chatbot designed to provide information about Smart India Hackathon (SIH) problem statements. It uses the Gemini API to understand and respond to user queries, helping you find and understand the problem statements you're interested in.

## Features

* **Natural Language Queries:** Ask questions in plain English to find SIH problem statements.
* **Detailed Information:** Get details about problem statements including title, organization, theme, category, and a full description.
* **Search by ID or Keywords:** You can search for problem statements using their ID number or by keywords.
* **Top Matches:** The chatbot will provide you with the most relevant matches for your query.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Python 3.x installed on your system. You can download it from [python.org](https://www.python.org/downloads/).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/sudhanshuraj13/sih_chat.git](https://github.com/sudhanshuraj13/sih_chat.git)
    cd sih_chat
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up your API Key:**
    * Create a `.env` file in the root directory of the project.
    * Add your Gemini API key to the `.env` file as follows:
        ```
        GEMINI_API_KEY="YOUR_API_KEY"
        ```

### Usage

To run the chatbot, use the following command:

```bash
chainlit run app.py -w
