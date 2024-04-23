const User = require('../models/userModel');
const bcrypt = require('bcrypt');


// SignIn function...

exports.signIn = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({
            message: 'User signed in successfully',
            userId: user._id,
            username: user.username,
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// SignUp function...

exports.signUp = async (req, res) => {
    const { username, email, password, phone_number } = req.body;
    // console.log(req.body)

    // res.send('SignUp API')
    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with the provided email' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user
        const user = new User({
            username,
            email,
            password_hash: hashedPassword,
            phone_number,
            created_at: new Date()
        });

        // Save the user in the database
        await user.save();

        res.status(201).json({
            message: 'User registered successfully',
            userId: user._id,
            username: user.username,
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
