const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const user = await User.findOne({ email: 'xaadhaider55@gmail.com' });
    if (user) {
      console.log('User found:', user.username);
    } else {
      console.log('User not found');
    }
    const allUsers = await User.find({});
    console.log('Total users:', allUsers.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUser();
