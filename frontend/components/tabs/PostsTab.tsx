import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

interface Post {
  id: string;
  author_display_name: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  created_at: string;
  comments_count: number;
}

export default function PostsTab() {
  const [posts, setPosts] = useState&lt;Post[]&gt;([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() =&gt; {
    fetchPosts();
  }, []);

  const fetchPosts = async () =&gt; {
    try {
      const response = await api.get('/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить посты');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () =&gt; {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) =&gt; {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes &lt; 1) return 'Только что';
    if (diffMinutes &lt; 60) return `${diffMinutes} мин назад`;
    if (diffHours &lt; 24) return `${diffHours} ч назад`;
    if (diffDays &lt; 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
  };

  const renderPost = ({ item }: { item: Post }) =&gt; (
    &lt;TouchableOpacity
      style={styles.postCard}
      onPress={() =&gt; router.push(`/post/${item.id}`)}
      activeOpacity={0.7}
    &gt;
      &lt;View style={styles.postHeader}&gt;
        &lt;Text style={styles.authorName}&gt;{item.author_display_name}&lt;/Text&gt;
        &lt;Text style={styles.postDate}&gt;{formatDate(item.created_at)}&lt;/Text&gt;
      &lt;/View&gt;
      
      &lt;Text style={styles.postTitle}&gt;{item.title}&lt;/Text&gt;
      &lt;Text style={styles.postContent} numberOfLines={3}&gt;
        {item.content}
      &lt;/Text&gt;
      
      {item.tags.length &gt; 0 &amp;&amp; (
        &lt;View style={styles.tagsContainer}&gt;
          {item.tags.slice(0, 3).map((tag, index) =&gt; (
            &lt;View key={index} style={styles.tag}&gt;
              &lt;Text style={styles.tagText}&gt;#{tag}&lt;/Text&gt;
            &lt;/View&gt;
          ))}
        &lt;/View&gt;
      )}
      
      &lt;View style={styles.postFooter}&gt;
        &lt;View style={styles.statsContainer}&gt;
          &lt;Ionicons name="chatbubble-outline" size={16} color="#666" /&gt;
          &lt;Text style={styles.statsText}&gt;{item.comments_count}&lt;/Text&gt;
        &lt;/View&gt;
        {item.images.length &gt; 0 &amp;&amp; (
          &lt;View style={styles.statsContainer}&gt;
            &lt;Ionicons name="image-outline" size={16} color="#666" /&gt;
            &lt;Text style={styles.statsText}&gt;{item.images.length}&lt;/Text&gt;
          &lt;/View&gt;
        )}
      &lt;/View&gt;
    &lt;/TouchableOpacity&gt;
  );

  const renderEmptyState = () =&gt; (
    &lt;View style={styles.emptyState}&gt;
      &lt;Ionicons name="newspaper-outline" size={64} color="#333" /&gt;
      &lt;Text style={styles.emptyTitle}&gt;Пока нет постов&lt;/Text&gt;
      &lt;Text style={styles.emptySubtitle}&gt;
        Станьте первым, кто поделится своей историей
      &lt;/Text&gt;
    &lt;/View&gt;
  );

  if (isLoading) {
    return (
      &lt;View style={styles.loadingContainer}&gt;
        &lt;ActivityIndicator size="large" color="#4ecdc4" /&gt;
        &lt;Text style={styles.loadingText}&gt;Загружаем посты...&lt;/Text&gt;
      &lt;/View&gt;
    );
  }

  return (
    &lt;View style={styles.container}&gt;
      &lt;View style={styles.header}&gt;
        &lt;Text style={styles.headerTitle}&gt;Криптонит&lt;/Text&gt;
        &lt;TouchableOpacity
          style={[styles.createButton, { zIndex: 1000 }]}
          onPress={() =&gt; {
            console.log('Create post button clicked!');
            try {
              router.push('/create-post');
              console.log('Navigation to create-post initiated');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }}
          activeOpacity={0.7}
          accessibilityLabel="Create post"
        &gt;
          &lt;Ionicons name="add" size={24} color="#4ecdc4" /&gt;
        &lt;/TouchableOpacity&gt;
      &lt;/View&gt;

      &lt;FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) =&gt; item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          &lt;RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ecdc4"
            colors={['#4ecdc4']}
          /&gt;
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      /&gt;
    &lt;/View&gt;
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#0c0c0c',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecdc4',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#4ecdc4',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
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