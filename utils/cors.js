
const SENTIMENT_API_URL = "http://127.0.0.1:5000/predict";
const NETWORK_IP = 'http://192.168.100.3:4000'
module.exports = {
  corsOptions: {
    origin: [
      process.env.CLIENT_URL, // use for localhost
       // NETWORK_IP, // use when you want to access on network IP
      SENTIMENT_API_URL,

    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  },
};
