# SIH Chat RAG 🤖

A **Retrieval-Augmented Generation (RAG)** chatbot specifically designed to answer questions about the **Smart India Hackathon (SIH)**. This project combines the power of vector databases, embeddings, and language models to provide accurate, context-aware responses about SIH problem statements, themes, organizations, and more.

## 🚀 Features

- **Smart Question Answering**: Get detailed answers about SIH problem statements, themes, and requirements
- **Context-Aware Conversations**: Maintains chat history for better contextual understanding
- **Comprehensive Dataset**: Includes SIH data from multiple years with detailed problem statements
- **Vector Search**: Fast and accurate retrieval using FAISS vector store
- **Real-time Processing**: Efficient document processing and embedding generation

## 📁 Project Structure

```
sih_chat_RAG/
├── data/                           # Dataset files
│   ├── problem_statements_cleaned.json
│   ├── processed_sih_documents.json
│   ├── sih_complete_dataset.json
│   └── sih_problem_statements_all_years.json
├── faiss_vectorstore/             # Vector database
│   ├── index.faiss
│   └── index.pkl
├── chain_sih.py                   # RAG chain implementation
├── context_sih.py                 # Prompt templates
├── vector_sih.py                  # Vector store operations
├── sih_runner.py                  # Main application runner
├── sih_scraper.py                 # Data scraping utilities
├── requirements.txt               # Dependencies
├── .env                          # Environment variables
└── .gitignore                    # Git ignore rules
```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Git

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd sih_chat_RAG
```

### Step 2: Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Environment Configuration
Create a `.env` file in the root directory and add your configuration:
```env
# Add your API keys and configuration here
OPENAI_API_KEY=your_openai_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_key_here
```

### Step 5: Initialize Vector Store
If you need to create the vector store from scratch:
```bash
python vector_sih.py
```

## 🚀 Usage

### Running the Chat Application
```bash
python sih_runner.py
```

### Using the RAG Chain
```python
from chain_sih import create_rag_chain
from vector_sih import load_vectorstore

# Load the vector store
vectorstore = load_vectorstore()

# Create the RAG chain
rag_chain = create_rag_chain(vectorstore)

# Ask questions
response = rag_chain.invoke({
    "input": "What are the cybersecurity themes in SIH 2024?",
    "chat_history": []
})
```

## 📊 Dataset Information

The project includes comprehensive SIH data:
- **Problem Statements**: Detailed descriptions and requirements
- **Organizations**: Government departments and agencies
- **Themes**: Technology categories and focus areas
- **Years**: Multi-year dataset coverage
- **Categories**: Software, Hardware, and other project types

## 🔧 Core Components

### [`vector_sih.py`](vector_sih.py)
- Creates and manages FAISS vector store
- Processes JSON datasets into embeddings
- Handles document loading and text splitting

### [`context_sih.py`](context_sih.py)
- Defines prompt templates for contextualization
- Manages chat history integration
- Provides SIH-specific system prompts

### [`chain_sih.py`](chain_sih.py)
- Implements the complete RAG pipeline
- Combines retrieval and generation components
- Handles conversation flow management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Example Queries

Try asking these questions:
- "What are the problem statements for blockchain theme in SIH 2024?"
- "Which organizations are participating in Smart Education theme?"
- "Tell me about cybersecurity projects in SIH"
- "What are the requirements for healthcare-related problem statements?"

## 🔍 Technical Details

- **Embeddings Model**: HuggingFace `all-MiniLM-L6-v2`
- **Vector Store**: FAISS for efficient similarity search
- **Text Splitting**: Recursive character text splitter with 1000 chunk size
- **Framework**: LangChain for RAG implementation

## 📋 Requirements

See [`requirements.txt`](requirements.txt) for the complete list of dependencies including:
- `langchain`
- `langchain-community`
- `langchain-huggingface`
- `faiss-cpu`
- `python-dotenv`

## 🚨 Important Notes

- The [`faiss_vectorstore/`](faiss_vectorstore/) directory contains pre-built embeddings
- Large data files are excluded from version control via [`.gitignore`](.gitignore)
- Ensure proper API key configuration before running

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Smart India Hackathon for providing comprehensive problem statement data
- HuggingFace for embedding models
- LangChain community for RAG framework
- FAISS for efficient vector search capabilities

---

**Built with ❤️ for the Smart India Hackathon community**