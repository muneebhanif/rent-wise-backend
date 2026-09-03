# import pickle
# import re
# import os

# def clean_text(text):
#     # Convert to lowercase
#     text = text.lower()
#     # Remove special characters and digits
#     text = re.sub(r'[^a-zA-Z\s]', '', text)
#     # Remove extra whitespace
#     text = ' '.join(text.split())
#     return text

# # Load the model and vectorizer
# current_dir = os.path.dirname(os.path.abspath(__file__))
# model_path = os.path.join(current_dir, 'sentiment_model.pkl')
# vectorizer_path = os.path.join(current_dir, 'tfidf_vectorizer.pkl')
# with open(model_path, 'rb') as model_file:
#     loaded_model = pickle.load(model_file)

# with open(vectorizer_path, 'rb') as vectorizer_file:
#     loaded_vectorizer = pickle.load(vectorizer_file)

# # Function to predict sentiment of a new statement using the loaded model
# def predict_sentiment(statement):
#     cleaned_statement = clean_text(statement)
#     statement_vectorized = loaded_vectorizer.transform([cleaned_statement])
#     prediction = loaded_model.predict(statement_vectorized)
#     return 'positive' if prediction[0] == 1 else 'negative'

# # Example usage

# if __name__ == "__main__":
#     user_input = input("Enter a statement: ")
#     print("Predicted sentiment:", predict_sentiment(user_input))



from flask import Flask, request, jsonify
import pickle
import re
import os

app = Flask(__name__)


print("Loading sentiment analysis model...")
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, 'sentiment_model.pkl')
vectorizer_path = os.path.join(current_dir, 'tfidf_vectorizer.pkl')
with open(model_path, 'rb') as model_file:
    loaded_model = pickle.load(model_file)

with open(vectorizer_path, 'rb') as vectorizer_file:
    loaded_vectorizer = pickle.load(vectorizer_file)

# Text cleaning function
def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = ' '.join(text.split())
    return text
print("model started")

@app.route('/predict', methods=['POST'])
def predict_sentiment():
    data = request.json
    print(data)
    comment = data.get("comment", "")
    print(comment)

    cleaned_comment = clean_text(comment)
    vectorized_comment = loaded_vectorizer.transform([cleaned_comment])
    prediction = loaded_model.predict(vectorized_comment)

    sentiment = "positive" if prediction[0] == 1 else "negative"
    return jsonify({"sentiment": sentiment})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
