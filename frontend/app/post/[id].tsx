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
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Post {
  id: string;
  author_id: string;  
  author_display_name: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  created_at: string;
  comments_count: number;
}

interface Comment {
  id: string;
  author_display_name: string;
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
  const insets = useSafeAreaInsets();

  // Platform specific top padding
  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      return (StatusBar.currentHeight || 0) + 10;
    }
    return insets.top;
  };

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else {
        Alert.alert('Ошибка', 'Пост не найден');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить пост');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Ошибка', 'Введите текст комментария');
      return;
    }

    if (!user?.token) {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}/comments`, {
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
        // Update comments count in post
        if (post) {
          setPost({ ...post, comments_count: post.comments_count + 1 });
        }
      } else {
        Alert.alert('Ошибка', 'Не удалось добавить комментарий');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Ошибка', 'Не удалось добавить комментарий');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePostMenu = () => {
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
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
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

  const handleReport = (targetType: string, targetId: string) => {
    Alert.alert(
      'Пожаловаться на контент',
      'Выберите причину жалобы:',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Спам', onPress: () => submitReport(targetType, targetId, 'Спам') },
        { text: 'Оскорбления', onPress: () => submitReport(targetType, targetId, 'Оскорбления') },
        { text: 'Неприемлемый контент', onPress: () => submitReport(targetType, targetId, 'Неприемлемый контент') },
      ]
    );
  };

  const submitReport = async (targetType: string, targetId: string, reason: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
        }),
      });

      if (response.ok) {
        Alert.alert('Спасибо', 'Ваша жалоба отправлена на рассмотрение');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecdc4" />
        <Text style={styles.loadingText}>Загружаем пост...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: getTopPadding() }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Пост не найден</Text>
        </View>
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
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Пост</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handlePostMenu}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Post */}
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <Text style={styles.authorName}>{post.author_display_name}</Text>
              <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
            </View>
            
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postContent}>{post.content}</Text>
            
            {/* Images */}
            {post.images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}
              >
                {post.images.map((imageUri, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUri }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}
            
            {/* Tags */}
            {post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.postStats}>
              <View style={styles.statsItem}>
                <Ionicons name="chatbubble-outline" size={16} color="#666" />
                <Text style={styles.statsText}>{post.comments_count} комментариев</Text>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Комментарии</Text>
            
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={40} color="#333" />
                <Text style={styles.emptyCommentsText}>Пока нет комментариев</Text>
                <Text style={styles.emptyCommentsSubtext}>Станьте первым, кто оставит комментарий</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author_display_name}</Text>
                    <TouchableOpacity
                      onPress={() => handleReport('comment', comment.id)}
                    >
                      <Ionicons name="flag-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        {user && (
          <View style={styles.commentInputContainer}>
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
              style={[styles.sendButton, (!newComment.trim() || isSubmittingComment) && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color="#4ecdc4" />
              ) : (
                <Ionicons name="send" size={20} color="#4ecdc4" />
              )}
            </TouchableOpacity>
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
    backgroundColor: '#0c0c0c',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  content: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ecdc4',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  postImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#4ecdc4',
  },
  postStats: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  commentsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  commentCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecdc4',
  },
  commentContent: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 14,
    color: '#fff',
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
  },
});