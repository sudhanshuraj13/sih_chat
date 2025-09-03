from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores.faiss import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document
import os
import glob
import json

load_dotenv()

def load_json_file(json_file):
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    documents = []
    filename = os.path.basename(json_file)
    
    if isinstance(data, list):
        for item in data:
            content = json.dumps(item, indent=2, ensure_ascii=False)
            doc = Document(page_content=content, metadata={"source": filename})
            documents.append(doc)
    else:
        content = json.dumps(data, indent=2, ensure_ascii=False)
        doc = Document(page_content=content, metadata={"source": filename})
        documents.append(doc)
    
    return documents

def create_vectorstore(data_json_path):
    all_documents = []
    
    json_files = glob.glob(os.path.join(data_json_path, "*.json"))
    print(f"Found {len(json_files)} JSON files to process")
    
    for json_file in json_files:
        print(f"Loading {os.path.basename(json_file)}...")
        documents = load_json_file(json_file)
        all_documents.extend(documents)
        print(f"Loaded {len(documents)} documents")

    print(f"\nTotal documents loaded: {len(all_documents)}")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200, 
        separators=["\n\n", "\n", " ", "."]
    )
    docs = text_splitter.split_documents(all_documents)
    print(f"Created {len(docs)} text chunks")
    
    print("Creating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    print("Building vector store...")
    vectorstore = FAISS.from_documents(docs, embeddings)
    vectorstore.save_local("faiss_vectorstore")
    print("Vector store saved successfully!")

    return vectorstore

def load_vectorstore():
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = FAISS.load_local("faiss_vectorstore", embeddings, allow_dangerous_deserialization=True)
    return vectorstore