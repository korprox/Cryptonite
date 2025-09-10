import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../utils/api';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pickImage = async () =&gt; {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled &amp;&amp; result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
    }
  };

  const removeImage = () =&gt; {
    setImageBase64('');
  };

  const handleSubmit = async () =&gt; {
    if (!content.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите содержание поста');
      return;
    }

    if (!user?.token) {
      Alert.alert('Ошибка', 'Вы не авторизованы');
      return;
    }

    setIsSubmitting(true);

    try {
      const tagsArray = tags
        .split(',')
        .map(tag =&gt; tag.trim())
        .filter(tag =&gt; tag.length &gt; 0);

      const payload: any = {
        title: title.trim() || '',
        content: content.trim(),
        images: imageBase64 ? [imageBase64] : [],
        tags: tagsArray,
      };

      const response = await api.post('/posts', payload, user.token);

      if (response.ok) {
        const newPost = await response.json();
        console.log('Post created successfully:', newPost.id);
        // Возвращаемся в ленту постов
        router.replace('/');
      } else {
        const errorData = await response.text();
        console.error('Error creating post:', errorData);
        Alert.alert('Ошибка', 'Не удалось создать пост');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Ошибка', 'Не удалось создать пост');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    &lt;View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}&gt;
      &lt;StatusBar backgroundColor="#0a0a0a" barStyle="light-content" /&gt;
      &lt;View style={styles.header}&gt;
        &lt;TouchableOpacity onPress={() =&gt; router.back()}&gt;
          &lt;Ionicons name="arrow-back" size={24} color="#fff" /&gt;
        &lt;/TouchableOpacity&gt;
        &lt;Text style={styles.headerTitle}&gt;Создать пост&lt;/Text&gt;
        &lt;TouchableOpacity
          style={[styles.publishButton, (!content.trim() || isSubmitting) &amp;&amp; styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        &gt;
          {isSubmitting ? (
            &lt;ActivityIndicator size="small" color="#fff" /&gt;
          ) : (
            &lt;Text style={styles.publishButtonText}&gt;Опубликовать&lt;/Text&gt;
          )}
        &lt;/TouchableOpacity&gt;
      &lt;/View&gt;

      &lt;KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      &gt;
        &lt;ScrollView style={styles.content}&gt;
          &lt;View style={styles.form}&gt;
            &lt;TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Заголовок (необязательно)"
              placeholderTextColor="#666"
              maxLength={100}
            /&gt;

            &lt;TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="О чем вы думаете?"
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              maxLength={2000}
            /&gt;

            &lt;TextInput
              style={styles.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Теги (через запятую)"
              placeholderTextColor="#666"
              maxLength={200}
            /&gt;

            {imageBase64 ? (
              &lt;View style={styles.imageContainer}&gt;
                &lt;Image
                  source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                /&gt;
                &lt;TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                &gt;
                  &lt;Ionicons name="close-circle" size={24} color="#ff6b6b" /&gt;
                &lt;/TouchableOpacity&gt;
              &lt;/View&gt;
            ) : (
              &lt;TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}&gt;
                &lt;Ionicons name="image" size={24} color="#4ecdc4" /&gt;
                &lt;Text style={styles.imagePickerText}&gt;Добавить изображение&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            )}

            &lt;View style={styles.guidelines}&gt;
              &lt;Text style={styles.guidelinesTitle}&gt;Правила сообщества:&lt;/Text&gt;
              &lt;Text style={styles.guidelinesText}&gt;
                • Будьте уважительны к другим участникам{'\n'}
                • Не публикуйте личную информацию{'\n'}
                • Избегайте оскорблений и угроз{'\n'}
                • Помните о поддержке и взаимопомощи
              &lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/ScrollView&gt;
      &lt;/KeyboardAvoidingView&gt;
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
  publishButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#333',
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  titleInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contentInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  tagsInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  imagePickerButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerText: {
    color: '#4ecdc4',
    fontSize: 16,
    marginLeft: 8,
  },
  guidelines: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
});