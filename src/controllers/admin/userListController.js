import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";

export const getUserByType = async (req, res) => {
    const userType = req.query.type;
    // console.log(userType)

    try {
        let result;
        switch(userType){
            case 'Registered' :
                result = await User.find({}).select('-password_hash')
                // console.log("Registered user list ", result)
                break;
                case 'Guest' :
                    result = await GuestUser.find({});
                    // console.log("Guest user list ", result) 
                break;
            default :
                return res.status(400).json({ message: "Invalid user type specified"});
        }
        res.json({
            type: userType,
            users: result
        });
    } catch (error) {
        res.status(500).json({ message: `Server error while retrieving ${userType} users`, error: error.message });
    }
}