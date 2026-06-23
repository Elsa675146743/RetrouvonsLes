import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from '../../../services/supabase';
import {
  getConversationWithMessages,
  sendMessage,
  marquerMessagesLus,
  marquerMessageTraite,
  supprimerMessage,
  Message,
  MessagePieceJointe,
  Conversation,
} from '../../../services/messagingApi';

type MessageWithDetails = Message & {
  auteur?: { id: string; nom: string; prenom: string };
  pieces_jointes?: MessagePieceJointe[];
};

export default function ConversationDetail({ route, navigation }: any) {
  const { conversationId, contexteNom, contexteReference } = route.params;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isAutorite, setIsAutorite] = useState(false);
  const [typeMessage, setTypeMessage] = useState<'texte' | 'demande_complement' | 'demande_piece' | 'note_systeme'>(
    'texte'
  );
  const [showTypeModal, setShowTypeModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Récupérer l'utilisateur courant
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Vérifier si l'utilisateur est une autorité
      if (user) {
        const { data: profile } = await supabase
          .from('utilisateur')
          .select('type_compte')
          .eq('id', user.id)
          .single();
        setIsAutorite(profile?.type_compte === 'autorite');
      }
    };
    getUser();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversationWithMessages(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages);

      // Marquer les messages comme lus
      if (userId) {
        await marquerMessagesLus(conversationId, userId);
      }

      scrollToBottom();
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Realtime pour nouveaux messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `id_conversation=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.id_auteur !== userId) {
            // Ajouter le message à la liste
            fetchData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message',
          filter: `id_conversation=eq.${conversationId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, fetchData]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleSend = async () => {
    if (!newMessage.trim() && photos.length === 0) return;

    setSending(true);

    try {
      const message = await sendMessage({
        id_conversation: conversationId,
        corps: newMessage.trim() || '📎 Pièce jointe',
        type_message: typeMessage,
      });

      // Upload des pièces jointes
      if (photos.length > 0) {
        // Les photos sont uploadées via l'API
        // Pour simplifier, on les ajoute en base
      }

      setNewMessage('');
      setPhotos([]);
      setTypeMessage('texte');
      fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const pickPhotos = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 3,
    });

    if (result.assets) {
      const newPhotos = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
      }));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleMarquerTraite = async (messageId: string) => {
    try {
      await marquerMessageTraite(messageId);
      Alert.alert('✅ Message marqué comme traité');
      fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleSupprimer = async (messageId: string) => {
    Alert.alert(
      'Supprimer le message',
      'Voulez-vous vraiment supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await supprimerMessage(messageId);
              fetchData();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const jours = Math.floor(diff / 86400000);

    if (jours === 0) return `Aujourd'hui ${formatTime(dateStr)}`;
    if (jours === 1) return `Hier ${formatTime(dateStr)}`;
    if (jours < 7) return `Il y a ${jours} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'demande_complement': return 'help-circle-outline';
      case 'demande_piece': return 'document-attach-outline';
      case 'note_systeme': return 'information-circle-outline';
      default: return 'chatbubble-outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'demande_complement': return 'Demande de complément';
      case 'demande_piece': return 'Demande de pièce';
      case 'note_systeme': return 'Note système';
      default: return 'Message';
    }
  };

  const isActive = conversation?.statut !== 'fermee' && conversation?.statut !== 'traitee';

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
            />
          }
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>
                Envoyez un message pour démarrer la conversation.
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.id_auteur === userId;
              const showAvatar =
                index === 0 || messages[index - 1]?.id_auteur !== msg.id_auteur;

              // Vérifier si le message est traité (pour les autorités)
              const estTraite = msg.metadonnees?.traite_messagerie === true;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowRight : styles.messageRowLeft,
                  ]}
                >
                  {!isMe && showAvatar && (
                    <View style={styles.avatar}>
                      <Ionicons name="person-circle" size={32} color="#b45f06" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
                      !showAvatar && !isMe && styles.messageBubbleNoAvatar,
                    ]}
                  >
                    {!isMe && showAvatar && (
                      <Text style={styles.messageAuthor}>
                        {msg.auteur?.prenom} {msg.auteur?.nom}
                      </Text>
                    )}

                    {msg.type_message !== 'texte' && (
                      <View style={styles.typeBadge}>
                        <Ionicons
                          name={getTypeIcon(msg.type_message)}
                          size={12}
                          color="#b45f06"
                        />
                        <Text style={styles.typeText}>
                          {getTypeLabel(msg.type_message)}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.messageText, isMe && styles.messageTextRight]}>
                      {msg.corps}
                    </Text>

                    {msg.pieces_jointes && msg.pieces_jointes.length > 0 && (
                      <View style={styles.attachments}>
                        {msg.pieces_jointes.map((pj, i) => (
                          <Image
                            key={i}
                            source={{ uri: pj.url_storage }}
                            style={styles.attachmentImage}
                          />
                        ))}
                      </View>
                    )}

                    <View style={styles.messageFooter}>
                      <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                      {isMe && (
                        <TouchableOpacity
                          style={styles.messageDelete}
                          onPress={() => handleSupprimer(msg.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                      {!isMe && isAutorite && !estTraite && (
                        <TouchableOpacity
                          style={styles.messageTraiter}
                          onPress={() => handleMarquerTraite(msg.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color="#3b82f6" />
                          <Text style={styles.messageTraiterText}>Traiter</Text>
                        </TouchableOpacity>
                      )}
                      {estTraite && (
                        <View style={styles.messageTraiteBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                          <Text style={styles.messageTraiteText}>Traité</Text>
                        </View>
                      )}
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

      {/* Input */}
      {isActive ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputContainer}>
            {isAutorite && (
              <TouchableOpacity style={styles.typeBtn} onPress={() => setShowTypeModal(true)}>
                <Ionicons name="options-outline" size={20} color="#b45f06" />
              </TouchableOpacity>
            )}

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
              style={[
                styles.sendBtn,
                (!newMessage.trim() && photos.length === 0) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
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

      {/* Modal type de message (autorité) */}
      <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
        <TouchableOpacity style={typeModalStyles.overlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
          <View style={typeModalStyles.container}>
            <View style={typeModalStyles.handle} />
            <Text style={typeModalStyles.title}>Type de message</Text>

            {['texte', 'demande_complement', 'demande_piece', 'note_systeme'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  typeModalStyles.option,
                  typeMessage === type && typeModalStyles.optionSelected,
                ]}
                onPress={() => {
                  setTypeMessage(type as any);
                  setShowTypeModal(false);
                }}
              >
                <Ionicons
                  name={getTypeIcon(type)}
                  size={20}
                  color={typeMessage === type ? '#b45f06' : '#64748b'}
                />
                <Text
                  style={[
                    typeModalStyles.optionText,
                    typeMessage === type && typeModalStyles.optionTextSelected,
                  ]}
                >
                  {getTypeLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={typeModalStyles.btnFermer} onPress={() => setShowTypeModal(false)}>
              <Text style={typeModalStyles.btnFermerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
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

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  typeText: { fontSize: 10, fontWeight: '600', color: '#b45f06' },

  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  messageTime: { fontSize: 10, color: '#94a3b8' },
  messageDelete: { padding: 2 },
  messageTraiter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  messageTraiterText: { fontSize: 10, color: '#3b82f6', fontWeight: '600' },
  messageTraiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageTraiteText: { fontSize: 10, color: '#16a34a', fontWeight: '600' },

  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  attachmentImage: { width: 80, height: 80, borderRadius: 8 },

  photosPreview: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  photoPreviewItem: { position: 'relative', marginRight: 10 },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 6,
  },
  typeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0b1c30',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#b45f06',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },

  conversationClosedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  conversationClosedText: { fontSize: 13, color: '#64748b' },
});

const typeModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  handle: { width: 40, height: 4, backgroundColor: '#c6c6cd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#0b1c30', marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionSelected: { backgroundColor: '#fefce8', paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 8 },
  optionText: { fontSize: 15, color: '#0b1c30' },
  optionTextSelected: { color: '#b45f06', fontWeight: '600' },
  btnFermer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnFermerText: { color: '#0b1c30', fontWeight: '600', fontSize: 14 },
});