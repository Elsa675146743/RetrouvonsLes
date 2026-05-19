import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform,
  Alert, Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../../services/supabase';

// Types selon le schéma
interface Message {
  id: string;
  contenu: string;
  id_expediteur: string;
  created_at: string;
  type_message: 'texte' | 'demande_complement' | 'demande_piece' | 'note_systeme';
  pieces_jointes: any[];
  deleted_at: string | null;
  metadonnees: any;
}

export default function ConversationDetail({ route, navigation }: any) {
  const { conversationId, contexteNom, contexteReference } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [conversationStatut, setConversationStatut] = useState<string>('ouverte');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Récupérer l'utilisateur courant
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Récupérer les messages (avec RLS conversation_user_can_access)
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message')
        .select(`
          id,
          contenu,
          id_expediteur,
          created_at,
          type_message,
          pieces_jointes,
          deleted_at,
          metadonnees,
          utilisateur:id_expediteur ( nom, prenom )
        `)
        .eq('id_conversation', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Marquer les messages reçus comme lus (via table message_lecture)
      if (userId) {
        const messagesRecus = (data || []).filter(m => m.id_expediteur !== userId);
        for (const msg of messagesRecus) {
          // Vérifier si déjà marqué comme lu
          const { data: existing } = await supabase
            .from('message_lecture')
            .select('id')
            .eq('id_message', msg.id)
            .eq('id_utilisateur', userId)
            .single();
          
          if (!existing) {
            await supabase
              .from('message_lecture')
              .insert({
                id_message: msg.id,
                id_utilisateur: userId,
                lu: true,
                date_lecture: new Date().toISOString(),
              });
          }
        }
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  // Récupérer le statut de la conversation
  const fetchConversationStatut = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation')
        .select('statut')
        .eq('id', conversationId)
        .single();
      
      if (!error && data) {
        setConversationStatut(data.statut);
      }
    } catch (error) {
      console.error('Erreur statut conversation:', error);
    }
  };

  // Realtime pour nouveaux messages
  useEffect(() => {
    fetchMessages();
    fetchConversationStatut();

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message',
        filter: `id_conversation=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.id_expediteur !== userId) {
          fetchMessages();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages, userId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Envoyer un message (insert dans table message)
  const sendMessage = async () => {
    if (!newMessage.trim() && photos.length === 0) return;
    
    setSending(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Upload des pièces jointes
      let piecesJointes = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `messages/${conversationId}/${Date.now()}_${Math.random()}.${ext}`;
        const blob = await (await fetch(photo.uri)).blob();
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, blob, { contentType: photo.type });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          
          // Insérer dans message_piece_jointe
          const { data: pjData } = await supabase
            .from('message_piece_jointe')
            .insert({
              nom_fichier: photo.name,
              mime_type: photo.type,
              taille_octets: blob.size,
              url_storage: urlData.publicUrl,
            })
            .select('id')
            .single();
          
          if (pjData) {
            piecesJointes.push({ id: pjData.id, url: urlData.publicUrl });
          }
        }
      }

      // Insérer le message
      const { error } = await supabase
        .from('message')
        .insert({
          id_conversation: conversationId,
          contenu: newMessage.trim() || '📎 Pièce jointe',
          id_expediteur: user.id,
          type_message: 'texte',
          pieces_jointes: piecesJointes.length > 0 ? piecesJointes : null,
        });

      if (error) throw error;

      // Mettre à jour la conversation
      await supabase
        .from('conversation')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      setNewMessage('');
      setPhotos([]);
      fetchMessages();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSending(false);
    }
  };

  // Ajouter des photos
  const pickPhotos = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 3 });
    if (result.assets) {
      const newPhotos = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      }));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'demande_complement': return 'help-circle-outline';
      case 'demande_piece': return 'document-attach-outline';
      case 'note_systeme': return 'information-circle-outline';
      default: return 'chatbubble-outline';
    }
  };

  const isConversationActive = conversationStatut !== 'fermee' && conversationStatut !== 'traitee';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{contexteNom}</Text>
          <Text style={styles.headerSubtitle}>{contexteReference}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b45f06" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Envoyez un message pour démarrer la conversation.</Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.id_expediteur === userId;
              const showAvatar = index === 0 || messages[index - 1]?.id_expediteur !== msg.id_expediteur;
              
              return (
                <View key={msg.id} style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
                  {!isMe && showAvatar && (
                    <View style={styles.avatar}>
                      <Ionicons name="person-circle" size={32} color="#b45f06" />
                    </View>
                  )}
                  <View style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
                    !showAvatar && !isMe && styles.messageBubbleNoAvatar
                  ]}>
                    {!isMe && showAvatar && (
                      <Text style={styles.messageAuthor}>Autorité</Text>
                    )}
                    {msg.type_message !== 'texte' && (
                      <View style={styles.typeBadge}>
                        <Ionicons name={getTypeIcon(msg.type_message)} size={12} color="#b45f06" />
                        <Text style={styles.typeText}>
                          {msg.type_message === 'demande_complement' ? 'Demande de complément' : 
                           msg.type_message === 'demande_piece' ? 'Demande de pièce' : 
                           'Note système'}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.messageText, isMe && styles.messageTextRight]}>
                      {msg.contenu}
                    </Text>
                    {msg.pieces_jointes?.length > 0 && (
                      <View style={styles.attachments}>
                        {msg.pieces_jointes.map((pj, i) => (
                          <Image key={i} source={{ uri: pj.url }} style={styles.attachmentImage} />
                        ))}
                      </View>
                    )}
                    <View style={styles.messageFooter}>
                      <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Photos sélectionnées */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosPreview}>
          {photos.map((photo, i) => (
            <View key={i} style={styles.photoPreviewItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input (désactivé si conversation fermée) */}
      {isConversationActive ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={pickPhotos} style={styles.attachBtn}>
              <Ionicons name="attach-outline" size={24} color="#b45f06" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Écrivez votre message..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={8000}
            />
            
            <TouchableOpacity
              style={[styles.sendBtn, (!newMessage.trim() && photos.length === 0) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={sending || (!newMessage.trim() && photos.length === 0)}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.conversationClosedBanner}>
          <Ionicons name="lock-closed" size={16} color="#64748b" />
          <Text style={styles.conversationClosedText}>Cette conversation est fermée</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0b1c30' },
  headerSubtitle: { fontSize: 11, color: '#b45f06' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  
  emptyMessages: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#0b1c30' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  
  avatar: { marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 },
  
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  messageBubbleLeft: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  messageBubbleRight: { backgroundColor: '#b45f06', borderBottomRightRadius: 4 },
  messageBubbleNoAvatar: { marginLeft: 40 },
  
  messageAuthor: { fontSize: 11, fontWeight: '600', color: '#b45f06', marginBottom: 4 },
  messageText: { fontSize: 14, color: '#0b1c30' },
  messageTextRight: { color: '#fff' },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  messageTime: { fontSize: 10, color: '#94a3b8' },
  
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  typeText: { fontSize: 10, fontWeight: '600', color: '#b45f06' },
  
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachmentImage: { width: 80, height: 80, borderRadius: 8 },
  
  photosPreview: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  photoPreviewItem: { position: 'relative', marginRight: 10 },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0b1c30', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#b45f06', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  
  conversationClosedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  conversationClosedText: { fontSize: 13, color: '#64748b' },
});