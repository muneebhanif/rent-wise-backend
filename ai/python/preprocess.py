import pandas as pd
import re
from sklearn.feature_extraction.text import TfidfVectorizer
import os

print(os.getcwd())

# Load dataset
os.chdir("server/ai/python/")
data = pd.read_csv("./1.csv")
data.columns = data.columns.str.strip()

print(data.columns)

# Preprocessing function
def preprocess_text(text):
    text = text.lower()  
    text = re.sub(r'\d+', '', text)  
    text = re.sub(r'[^\w\s]', '', text)  
    text = re.sub(r'\s+', ' ', text).strip()  
    return text

# Apply preprocessing
data['Cleaned_Review'] = data['text'].apply(preprocess_text)

# Vectorize text data
vectorizer = TfidfVectorizer(max_features=5000)
X = vectorizer.fit_transform(data['Cleaned_Review'])

# Use 'airline_sentiment' as the target
y = data['airline_sentiment']


from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LogisticRegression()
model.fit(X_train, y_train)
print("Accuracy:", model.score(X_test, y_test))


from transformers import BertTokenizer, TFBertForSequenceClassification

tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
model = TFBertForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=3)

inputs = tokenizer(list(data['Cleaned_Review']), return_tensors="tf", padding=True, truncation=True)
model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
model.fit(inputs, y, epochs=5, batch_size=16)


from sklearn.metrics import classification_report

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
