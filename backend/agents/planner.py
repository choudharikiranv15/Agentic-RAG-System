"""
Planner Agent - The Brain of the Agentic RAG System

This is the core agent that orchestrates the entire RAG workflow.

Key Concept: The ReAct Pattern
-------------------------------
ReAct = Reasoning + Acting

The agent follows this loop:
1. **Thought**: Think about what to do
2. **Action**: Use a tool (e.g., search_documents)
3. **Observation**: See the result
4. **Repeat** until it has enough information
5. **Final Answer**: Provide the answer to the user

Example:
--------
Question: "What is the submission deadline?"

Thought: I need to search for deadline information
Action: retrieve_tool
Action Input: "submission deadline"
Observation: [Found text mentioning "Submit via email..."]
Thought: I now have the answer
Final Answer: "You need to submit via email with GitHub URL, video link, and PDF."

This is AGENTIC because the LLM decides the steps autonomously!
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, initialize_agent, AgentType
from backend.agents.retriever import retrieve_tool
import os
from dotenv import load_dotenv

load_dotenv()


def get_agent_executor():
    """
    Creates and returns the ReAct agent executor.
    
    Returns:
        AgentExecutor: The configured agent ready to answer questions
        
    Raises:
        ValueError: If GOOGLE_API_KEY is not set
    """
    # Get API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY not found in environment variables.\n"
            "Please create a .env file with your API key.\n"
            "Get one free at: https://makersuite.google.com/app/apikey"
        )
    
    # Initialize LLM
    # Using Gemini 1.5 Flash for speed and cost-effectiveness
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0,  # Deterministic responses
        convert_system_message_to_human=True  # Gemini compatibility
    )
    
    # Tools available to the agent
    tools = [retrieve_tool]
    
    # Create the agent using initialize_agent (compatible with more LangChain versions)
    agent_executor = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,  # Print the thinking process
        handle_parsing_errors=True,  # Gracefully handle errors
        max_iterations=5,  # Prevent infinite loops
        return_intermediate_steps=True  # Return the thought process
    )
    
    return agent_executor


def ask_question(question: str) -> dict:
    """
    Ask a question to the agent.
    
    Args:
        question: The user's question
        
    Returns:
        dict with 'output' (answer) and 'intermediate_steps' (thought process)
    """
    agent = get_agent_executor()
    result = agent.invoke({"input": question})
    return result


if __name__ == "__main__":
    # Test the agent
    print("\n" + "="*60)
    print("🤖 TESTING AGENTIC RAG SYSTEM")
    print("="*60)
    
    test_question = "What is the objective of this assignment?"
    
    print(f"\n❓ Question: {test_question}\n")
    
    try:
        result = ask_question(test_question)
        print("\n" + "="*60)
        print("📝 FINAL ANSWER:")
        print("="*60)
        print(result['output'])
        
    except ValueError as e:
        print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
