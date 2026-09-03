
const SENTIMENT_API_URL = "http://127.0.0.1:5000/predict";
const NETWORK_IP = 'http://192.168.100.3:4000'
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.LOCAL_CLIENT_URL || "http://localhost:4000",
  SENTIMENT_API_URL,
].filter(Boolean);
module.exports = {
  corsOptions: {
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  },
};
