import { Client, Databases, Storage } from 'appwrite';

if(!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || !process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID) {
  throw new Error('Missing Appwrite env: EXPO_PUBLIC_APPWRITE_PROJECT_ID or EXPO_PUBLIC_APPWRITE_DATABASE_ID');
}
if(!process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID){
  throw new Error('Missing Appwrite env: EXPO_PUBLIC_APPWRITE_BUCKET_ID (create a Storage bucket and set its ID)');
}


const appwriteConfig = {
    endpoint : 'https://cloud.appwrite.io/v1',
    projectId : process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    platform: "com.mhmd76.chatapp",
    db :process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    bucket : process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
    col:{
        chatrooms:"68ad824c00373298e7ee",
        messages:"68ad821a003af3141aa7"
    }
};

const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)

const db = new Databases(client);
const storage = new Storage(client);

export { appwriteConfig, client, db, storage };
