import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
// WebRTC imports - disabled for web compatibility
// import {
//   RTCPeerConnection,
//   RTCIceCandidate,
//   RTCSessionDescription,
//   mediaDevices,
// } from 'react-native-webrtc';

interface Message {
  id: string;
  sender_id: string;
  sender_display_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface CallRequest {
  id: string;
  caller_id: string;
  caller_display_name: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// WebRTC configuration
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callRequest, setCallRequest] = useState<CallRequest | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerConnection = useRef<any>(null);
  const callTimer = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<Date | null>(null);

  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      return (StatusBar.currentHeight || 0) + 10;
    }
    return insets.top;
  };

  useEffect(() => {
    if (chatId && user) {
      fetchMessages();
      // Set up polling for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [chatId, user]);

  useEffect(() => {
    // Initialize WebRTC peer connection
    if (user) {
      setupPeerConnection();
    }
    
    return () => {
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [user]);

  const setupPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(pcConfig);
    
    peerConnection.current.onicecandidate = async (event) => {
      if (event.candidate && user?.token) {
        try {
          await fetch(`${API_BASE_URL}/api/webrtc/ice-candidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              chat_id: chatId,
              candidate: event.candidate,
            }),
          });
        } catch (error) {
          console.error('Error sending ICE candidate:', error);
        }
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current?.connectionState);
      if (peerConnection.current?.connectionState === 'connected') {
        startCallTimer();
      } else if (peerConnection.current?.connectionState === 'disconnected') {
        endCall();
      }
    };
  };

  const fetchMessages = async () => {
    if (!user?.token || !chatId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    console.log('Send message clicked!', { newMessage, user: !!user?.token, isSending });
    if (!newMessage.trim() || !user?.token || isSending) return;

    setIsSending(true);
    
    try {
      console.log('Sending message to:', `${API_BASE_URL}/api/chats/${chatId}/messages`);
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        const messageData = await response.json();
        console.log('Message sent successfully:', messageData);
        setNewMessage('');
        fetchMessages();
      } else {
        const errorText = await response.text();
        console.error('Failed to send message:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setIsSending(false);
    }
  };

  const initiateCall = async () => {
    if (!user?.token) return;

    try {
      // Request microphone permission
      const stream = await mediaDevices.getUserMedia({ audio: true });
      
      // Add audio track to peer connection
      if (peerConnection.current) {
        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });
      }

      // Create call request
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/call-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const callData = await response.json();
        setCallRequest(callData);
        
        // Create and send WebRTC offer
        if (peerConnection.current) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          
          await fetch(`${API_BASE_URL}/api/webrtc/offer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              chat_id: chatId,
              offer: offer,
            }),
          });
        }
        
        Alert.alert('Звонок', 'Запрос на звонок отправлен. Ожидаем ответа...');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Ошибка', 'Не удалось инициировать звонок');
    }
  };

  const startCallTimer = () => {
    callStartTime.current = new Date();
    setCallDuration(0);
    
    callTimer.current = setInterval(() => {
      if (callStartTime.current) {
        const elapsed = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000);
        setCallDuration(elapsed);
        
        // Auto-end call after 30 minutes (1800 seconds)
        if (elapsed >= 1800) {
          endCall();
          Alert.alert('Звонок завершен', 'Достигнут лимит времени звонка (30 минут)');
        }
      }
    }, 1000);
  };

  const endCall = async () => {
    if (callRequest && user?.token) {
      try {
        await fetch(`${API_BASE_URL}/api/call-requests/${callRequest.id}/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }

    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      setupPeerConnection(); // Setup new connection for future calls
    }
    
    setIsInCall(false);
    setCallRequest(null);
    setCallDuration(0);
    callStartTime.current = null;
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{item.sender_display_name}</Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecdc4" />
        <Text style={styles.loadingText}>Загружаем чат...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: getTopPadding() }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Анонимный диалог</Text>
            {isInCall && (
              <Text style={styles.callDuration}>
                {formatCallDuration(callDuration)}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.callButton, isInCall && styles.callButtonActive]}
            onPress={isInCall ? endCall : initiateCall}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isInCall ? "call" : "call-outline"} 
              size={24} 
              color={isInCall ? "#ff6b6b" : "#4ecdc4"} 
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          inverted
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Написать сообщение..."
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
            onSubmitEditing={() => {
              console.log('Enter key pressed!');
              if (newMessage.trim()) {
                sendMessage();
              }
            }}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
              { zIndex: 1000 }
            ]}
            onPress={() => {
              console.log('Send button pressed!', { newMessage, disabled: !newMessage.trim() || isSending });
              sendMessage();
            }}
            disabled={!newMessage.trim() || isSending}
            activeOpacity={0.7}
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#4ecdc4" />
            ) : (
              <Ionicons name="send" size={20} color="#4ecdc4" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#0c0c0c',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  callDuration: {
    fontSize: 14,
    color: '#4ecdc4',
    marginTop: 2,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonActive: {
    borderColor: '#ff6b6b',
    backgroundColor: '#2a1a1a',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#4ecdc4',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#4ecdc4',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(0,0,0,0.6)',
  },
  otherMessageTime: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
    color: '#fff',
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});