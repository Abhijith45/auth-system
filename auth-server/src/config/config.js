import dotenv from 'dotenv'

dotenv.config();

if(!process.env.MONGO_URI){
    throw new Error('MongoDB URI not Found in ENV file')
}

if(!process.env.JWT_SECRET){
    throw new Error('JWT Secret not Found in ENV file')
}

if(!process.env.GOOGLE_CLIENT_ID){
    throw new Error('Google Client ID not Found in ENV file')
}

if(!process.env.GOOGLE_SECRET){
    throw new Error('Google Secret not Found in ENV file')
}

if(!process.env.GOOGLE_REFRESH_TOKEN){
    throw new Error('Google Refresh Token not Found in ENV file')
}

if(!process.env.GOOGLE_USER){
    throw new Error('Google User not Found in ENV file')
}

const authConfig = {
    MONGO_URI : process.env.MONGO_URI,
    JWT_SECRET : process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID,
    GOOGLE_SECRET : process.env.GOOGLE_SECRET,
    GOOGLE_REFRESH_TOKEN : process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_USER : process.env.GOOGLE_USER
}

export default authConfig;