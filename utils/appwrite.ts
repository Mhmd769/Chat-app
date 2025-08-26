import {Client , Databases} from 'appwrite';

if(!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || !process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID) {
  throw new Error('Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variable');
}


const appwriteConfig = {
    endpoint : 'https://cloud.appwrite.io/v1',
    projectId : process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    platform: "com.mhmd76.chatapp",
    db :process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    col:{
        chatrooms:"68ad824c00373298e7ee",
        messages:"68ad821a003af3141aa7"
    }
};

const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)

const db = new Databases(client);    

export {client, db, appwriteConfig}; 