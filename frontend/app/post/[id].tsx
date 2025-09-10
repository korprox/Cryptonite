import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Post {
  id: string;
  author_id: string;
  author: string;
  title?: string;
  content: string;
  image_base64?: string;
  tags: string[];
  created_at: string;
  comments_count: number;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.token) return;

    setIsSubmittingComment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePostMenu = () => {
    console.log('Menu button clicked!');
    setShowMenu(true);
  };

  const closeMenu = () => {
    setShowMenu(false);
  };

  const createChatWithAuthor = async () => {
    if (!user?.token || !post) return;

    if (post.author_id === user.id) {
      Alert.alert('Информация', 'Это ваш собственный пост');
      return;
    }

    try {
      setShowMenu(false);
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',  
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          receiver_id: post.author_id,
        }),
      });

      if (response.ok) {
        const chatData = await response.json();
        router.push(`/chat/${chatData.id}`);
      } else {
        console.error('Failed to create chat, status:', response.status);
        Alert.alert('Ошибка', 'Не удалось создать чат');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Ошибка', 'Не удалось создать чат');
    }
  };

  const handleReport = async (type: 'post' | 'comment', itemId: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          type,
          target_id: itemId,
          reason: 'Inappropriate content',
        }),
      });

      if (response.ok) {
        Alert.alert('Спасибо', 'Ваша жалоба принята');
      }
    } catch (error) {
      console.error('Error reporting:', error);
    }

    Alert.alert(
      'Пожаловаться на контент',
      'Ваша жалоба принята. Мы рассмотрим её в ближайшее время.',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Пост</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ecdc4" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Пост</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Пост не найден</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}>
      <StatusBar backgroundColor="#0a0a0a" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Пост</Text>
        <TouchableOpacity
          style={[styles.menuButton, { zIndex: 1000 }]}
          onPress={handlePostMenu}
          activeOpacity={0.7}
          accessibilityLabel="Menu"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.author}>{post.author}</Text>
              <Text style={styles.timestamp}>
                {new Date(post.created_at).toLocaleDateString('ru-RU')}
              </Text>
            </View>

            {post.title && (
              <Text style={styles.title}>{post.title}</Text>
            )}

            <Text style={styles.content}>{post.content}</Text>

            {post.image_base64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${post.image_base64}` }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}

            {post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag, index) => (
                  <Text key={index} style={styles.tag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.postStats}>
              <Text style={styles.statsText}>
                {post.comments_count} комментарие{post.comments_count === 1 ? 'й' : 'в'}
              </Text>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Комментарии</Text>
            
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <Text style={styles.commentTimestamp}>
                    {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))}

            <View style={styles.addCommentSection}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Написать комментарий..."
                placeholderTextColor="#666"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.submitButton, !newComment.trim() && styles.submitButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Custom Modal for menu */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                closeMenu();
                createChatWithAuthor();
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#4ecdc4" />
              <Text style={styles.modalButtonText}>Написать автору</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                closeMenu();
                handleReport('post', post?.id || '');
              }}
            >
              <Ionicons name="flag-outline" size={20} color="#ff6b6b" />
              <Text style={[styles.modalButtonText, { color: '#ff6b6b' }]}>Пожаловаться</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeMenu}
            >
              <Text style={[styles.modalButtonText, { color: '#666' }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  author: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: '#e0e0e0',
    lineHeight: 24,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    fontSize: 14,
    color: '#4ecdc4',
    marginRight: 8,
    marginBottom: 4,
  },
  postStats: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  commentsSection: {
    margin: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  cancelButton: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
    justifyContent: 'center',
  },
});