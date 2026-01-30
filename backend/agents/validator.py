"""
Validator Agent - Quality Control

This agent checks if answers are grounded in the retrieved documents.
It helps prevent hallucinations.

Key Concept: Hallucination Prevention
--------------------------------------
Problem: LLMs sometimes make up plausible-sounding but false information.
Solution: Validate that the answer is supported by retrieved documents.

This is a simple implementation - in production, you might use:
- More sophisticated fact-checking
- Confidence scores
- Multiple validation passes
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()


VALIDATION_PROMPT = """You are a fact-checker. Your job is to verify if an answer is supported by the provided context.

Context from documents:
{context}

Proposed Answer:
{answer}

Question: Is the proposed answer fully supported by the context? 

Respond with:
- "VALID" if the answer is supported by the context
- "INVALID: [reason]" if the answer contains information not in the context or contradicts it
- "PARTIAL: [explanation]" if the answer is partially supported

Your response:"""


def validate_answer(answer: str, context: str) -> dict:
    """
    Validate if an answer is grounded in the retrieved context.
    
    Args:
        answer: The proposed answer
        context: The retrieved document chunks
        
    Returns:
        dict with 'is_valid' (bool) and 'explanation' (str)
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        # Skip validation if no API key
        return {"is_valid": True, "explanation": "Validation skipped (no API key)"}
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0
    )
    
    prompt = ChatPromptTemplate.from_template(VALIDATION_PROMPT)
    chain = prompt | llm
    
    result = chain.invoke({"context": context, "answer": answer})
    response = result.content.strip()
    
    is_valid = response.startswith("VALID")
    
    return {
        "is_valid": is_valid,
        "explanation": response
    }


if __name__ == "__main__":
    # Test validation
    test_context = "The assignment requires building an Agentic RAG System."
    test_answer = "You need to build an Agentic RAG System."
    
    result = validate_answer(test_answer, test_context)
    print(f"Valid: {result['is_valid']}")
    print(f"Explanation: {result['explanation']}")
