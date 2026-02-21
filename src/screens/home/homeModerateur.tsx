import { Text, View } from "react-native";

export default function HomeModerateur({ level }: { level: number }) {
  return (
    <View style={{flex:1}}>
      <View style={{padding:40, backgroundColor:'#FFC107'}}><Text style={{fontWeight:'bold'}}>Modération</Text></View>
      <View style={{padding:20}}><Text>Vérifier les signalements abusifs</Text></View>
    </View>
  );
}