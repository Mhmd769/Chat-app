import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function Chat(){
    const {chat:chatId}=useLocalSearchParams();
    return (
        <View>
            <Text>{chatId}</Text>
        </View>
    )
}