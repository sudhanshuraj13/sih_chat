from vector_sih import load_vectorstore
from chain_sih import create_rag_chain
import tiktoken
import time

def count_tokens(text, model="llama-3.1-8b-instant"):
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except:
        return len(text) // 4

def validate_input(user_input, max_tokens=150, max_length=800):
    if len(user_input) > max_length:
        return False, f"Input too long. Maximum {max_length} characters allowed."
    
    token_count = count_tokens(user_input)
    if token_count > max_tokens:
        return False, f"Input too long. Maximum {max_tokens} tokens allowed. Your input: {token_count} tokens."
    
    suspicious_words = ["repeat", "ignore", "system", "prompt", "instructions", "override"]
    if any(word in user_input.lower() for word in suspicious_words):
        return False, "Input contains restricted content."
    
    return True, ""

def main():
    print("Loading vectorstore...")
    vectorstore = load_vectorstore()
    
    print("Creating RAG chain...")
    rag_chain = create_rag_chain(vectorstore)
    
    print("RAG chain ready!")
    print("\n" + "="*60)
    print("🤖 SIH CHATBOT - Ask about Smart India Hackathon")
    print("Type 'quit' to exit | Max: 150 tokens, 800 characters")
    print("="*60)
    
    chat_history = []
    request_count = 0
    start_time = time.time()
    
    while True:
        user_input = input("\n👤 You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'bye', 'stop']:
            print("👋 Thank you for using SIH Chatbot!")
            break
            
        if not user_input:
            continue
        
        current_time = time.time()
        if current_time - start_time < 60:
            if request_count >= 15:
                print("⚠️ Rate limit exceeded. Please wait a minute.")
                continue
        else:
            request_count = 0
            start_time = current_time
        
        is_valid, error_msg = validate_input(user_input)
        if not is_valid:
            print(f"❌ {error_msg}")
            continue
        
        try:
            result = rag_chain.invoke({
                "input": user_input,
                "chat_history": chat_history
            })
            
            print(f"\n🤖 Bot: {result['answer']}")
            
            chat_history.extend([
                ("human", user_input),
                ("assistant", result['answer'][:250] + "..." if len(result['answer']) > 250 else result['answer'])
            ])
            
            if len(chat_history) > 16:
                chat_history = chat_history[-16:]
            
            request_count += 1
                
        except Exception as e:
            print(f"❌ Error: {e}")
            print("Please try again with a different question.")

if __name__ == "__main__":
    main()