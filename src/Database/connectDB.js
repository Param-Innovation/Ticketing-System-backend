import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// // MongoDB URI
// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER_URL}/`;
// console.log(uri)


const connectDB = () => {
    mongoose.set("strictQuery", false);

    // Using the provided URI with username and password already included
    const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER_URL}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

    mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log("Connected to DB");
    }).catch(err => {
        console.error("Error connecting to MongoDB:", err);
    });
}

export default connectDB;
