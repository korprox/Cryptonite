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
  StatusBar,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../utils/api';

interface Post {
  id: string;
  author_id: string;
  author_display_name: string;
  title?: string;
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
  const { id } = useLocalSearchParams&lt;{ id: string }&gt;();
  const [post, setPost] = useState&lt;Post | null&gt;(null);
  const [comments, setComments] = useState&lt;Comment[]&gt;([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() =&gt; {
    if (id) {
      fetchPost();
      fetchComments();
    }
  }, [id]);

  const fetchPost = async () =&gt; {
    try {
      const response = await api.get(`/posts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const fetchComments = async () =&gt; {
    try {
      const response = await api.get(`/posts/${id}/comments`);
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

  const handleAddComment = async () =&gt; {
    if (!newComment.trim() || !user?.token) return;

    setIsSubmittingComment(true);

    try {
      const response = await api.post(`/posts/${id}/comments`, { content: newComment.trim() }, user.token);

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

  const handlePostMenu = () =&gt; {
    console.log('Menu button clicked!');
    setShowMenu(true);
  };

  const closeMenu = () =&gt; {
    setShowMenu(false);
  };

  const createChatWithAuthor = async () =&gt; {
    if (!user?.token || !post) return;

    if (post.author_id === user.id) {
      Alert.alert('Информация', 'Это ваш собственный пост');
      return;
    }

    try {
      setShowMenu(false);
      const response = await api.post('/chats', { receiver_id: post.author_id }, user.token);

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

  const handleReport = async (target_type: 'post' | 'comment', itemId: string) =&gt; {
    if (!user?.token) return;

    try {
      const response = await api.post('/reports', {
        target_type,
        target_id: itemId,
        reason: 'Inappropriate content',
      }, user.token);

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
      &lt;View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}&gt;
        &lt;View style={styles.header}&gt;
          &lt;TouchableOpacity onPress={() =&gt; router.back()}&gt;
            &lt;Ionicons name="arrow-back" size={24} color="#fff" /&gt;
          &lt;/TouchableOpacity&gt;
          &lt;Text style={styles.headerTitle}&gt;Пост&lt;/Text&gt;
          &lt;View style={{ width: 40 }} /&gt;
        &lt;/View&gt;
        &lt;View style={styles.loadingContainer}&gt;
          &lt;ActivityIndicator size="large" color="#4ecdc4" /&gt;
          &lt;Text style={styles.loadingText}&gt;Загрузка...&lt;/Text&gt;
        &lt;/View&gt;
      &lt;/View&gt;
    );
  }

  if (!post) {
    return (
      &lt;View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}&gt;
        &lt;View style={styles.header}&gt;
          &lt;TouchableOpacity onPress={() =&gt; router.back()}&gt;
            &lt;Ionicons name="arrow-back" size={24} color="#fff" /&gt;
          &lt;/TouchableOpacity&gt;
          &lt;Text style={styles.headerTitle}&gt;Пост&lt;/Text&gt;
        &lt;/View&gt;
        &lt;View style={styles.errorContainer}&gt;
          &lt;Text style={styles.errorText}&gt;Пост не найден&lt;/Text&gt;
        &lt;/View&gt;
      &lt;/View&gt;
    );
  }

  return (
    &lt;View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}&gt;
      &lt;StatusBar backgroundColor="#0a0a0a" barStyle="light-content" /&gt;
      &lt;View style={styles.header}&gt;
        &lt;TouchableOpacity onPress={() =&gt; router.back()}&gt;
          &lt;Ionicons name="arrow-back" size={24} color="#fff" /&gt;
        &lt;/TouchableOpacity&gt;
        &lt;Text style={styles.headerTitle}&gt;Пост&lt;/Text&gt;
        &lt;TouchableOpacity
          style={[styles.menuButton, { zIndex: 1000 }]}
          onPress={handlePostMenu}
          activeOpacity={0.7}
          accessibilityLabel="Menu"
        &gt;
          &lt;Ionicons name="ellipsis-horizontal" size={24} color="#fff" /&gt;
        &lt;/TouchableOpacity&gt;
      &lt;/View&gt;

      &lt;KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      &gt;
        &lt;ScrollView style={styles.content}&gt;
          &lt;View style={styles.postCard}&gt;
            &lt;View style={styles.postHeader}&gt;
              &lt;Text style={styles.author}&gt;{post.author_display_name}&lt;/Text&gt;
              &lt;Text style={styles.timestamp}&gt;
                {new Date(post.created_at).toLocaleDateString('ru-RU')}
              &lt;/Text&gt;
            &lt;/View&gt;

            {post.title &amp;&amp; (
              &lt;Text style={styles.title}&gt;{post.title}&lt;/Text&gt;
            )}

            &lt;Text style={styles.postContent}&gt;{post.content}&lt;/Text&gt;

            {post.images &amp;&amp; post.images.length &gt; 0 &amp;&amp; (
              &lt;Image
                source={{ uri: `data:image/jpeg;base64,${post.images[0]}` }}
                style={styles.postImage}
                resizeMode="cover"
              /&gt;
            )}

            {post.tags.length &gt; 0 &amp;&amp; (
              &lt;View style={styles.tagsContainer}&gt;
                {post.tags.map((tag, index) =&gt; (
                  &lt;Text key={index} style={styles.tag}&gt;
                    #{tag}
                  &lt;/Text&gt;
                ))}
              &lt;/View&gt;
            )}

            &lt;View style={styles.postStats}&gt;
              &lt;Text style={styles.statsText}&gt;
                {post.comments_count} комментарие{post.comments_count === 1 ? 'й' : 'в'}
              &lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;

          &lt;View style={styles.commentsSection}&gt;
            &lt;Text style={styles.commentsTitle}&gt;Комментарии&lt;/Text&gt;
            
            {comments.map((comment) =&gt; (
              &lt;View key={comment.id} style={styles.commentCard}&gt;
                &lt;View style={styles.commentHeader}&gt;
                  &lt;Text style={styles.commentAuthor}&gt;{comment.author_display_name}&lt;/Text&gt;
                  &lt;Text style={styles.commentTimestamp}&gt;
                    {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                  &lt;/Text&gt;
                &lt;/View&gt;
                &lt;Text style={styles.commentContent}&gt;{comment.content}&lt;/Text&gt;
              &lt;/View&gt;
            ))}

            &lt;View style={styles.addCommentSection}&gt;
              &lt;TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Написать комментарий..."
                placeholderTextColor="#666"
                multiline
                maxLength={500}
              /&gt;
              &lt;TouchableOpacity
                style={[styles.submitButton, !newComment.trim() &amp;&amp; styles.submitButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
              &gt;
                {isSubmittingComment ? (
                  &lt;ActivityIndicator size="small" color="#fff" /&gt;
                ) : (
                  &lt;Ionicons name="send" size={20} color="#fff" /&gt;
                )}
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/ScrollView&gt;
      &lt;/KeyboardAvoidingView&gt;

      {/* Custom Modal for menu */}
      &lt;Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      &gt;
        &lt;TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        &gt;
          &lt;View style={styles.modalContent}&gt;
            &lt;TouchableOpacity
              style={styles.modalButton}
              onPress={() =&gt; {
                closeMenu();
                createChatWithAuthor();
              }}
            &gt;
              &lt;Ionicons name="chatbubble-outline" size={20} color="#4ecdc4" /&gt;
              &lt;Text style={styles.modalButtonText}&gt;Написать автору&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            
            &lt;TouchableOpacity
              style={styles.modalButton}
              onPress={() =&gt; {
                closeMenu();
                handleReport('post', post?.id || '');
              }}
            &gt;
              &lt;Ionicons name="flag-outline" size={20} color="#ff6b6b" /&gt;
              &lt;Text style={[styles.modalButtonText, { color: '#ff6b6b' }]}&gt;Пожаловаться&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            
            &lt;TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeMenu}
            &gt;
              &lt;Text style={[styles.modalButtonText, { color: '#666' }]}&gt;Отмена&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/TouchableOpacity&gt;
      &lt;/Modal&gt;
    &lt;/View&gt;
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
  postContent: {
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