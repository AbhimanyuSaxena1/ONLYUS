import React, { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { apiClient } from '../../services/api';
import { Message } from '../../types';
import { Avatar } from '../../components/Avatar';

export const ChatWindow: React.FC = () => {
  const { user, partner } = useAuthStore();
  const {
    messages,
    isLoading,
    isPartnerTyping,
    replyingTo,
    fetchMessages,
    sendMessage,
    sendTyping,
    setReplyingTo,
    deleteMessage,
  } = useChatStore();

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (partner) {
      sendTyping(partner.id || (partner as any)._id, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(partner.id || (partner as any)._id, false);
      }, 1500);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedImage) || !partner) return;

    let attachment = undefined;

    if (selectedImage) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', selectedImage);

        const { data } = await apiClient.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        attachment = data.data;
      } catch (err) {
        alert('Failed to upload image. Please try again.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const partnerId = partner.id || (partner as any)._id;
    await sendMessage(partnerId, text.trim(), attachment);

    setText('');
    handleClearImage();
  };

  const formatMessageTime = (dateStr: string | Date): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-md mx-auto bg-[#080808]">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[#71717A]">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#71717A]">
            <Avatar
              src={partner?.profilePicture}
              name={partner?.name || 'Partner'}
              size="lg"
              className="mb-3 opacity-60"
            />
            <p className="text-sm font-medium text-white mb-1">
              Your private conversation with {partner?.name}
            </p>
            <p className="text-xs text-[#71717A]">
              Say hello or send a photo to start chatting ❤️
            </p>
          </div>
        ) : (
          messages.map((msg: Message) => {
            const senderId = typeof msg.sender === 'object' ? (msg.sender as any)._id : msg.sender;
            const currentUserId = user?.id || (user as any)?._id;
            const isMe = senderId === currentUserId;

            return (
              <div
                key={msg._id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Replying To preview */}
                {msg.replyTo && typeof msg.replyTo === 'object' && (
                  <div
                    className={`text-[11px] mb-1 px-2.5 py-1 rounded-lg border border-[#292929] bg-[#111111] text-[#A1A1AA] max-w-[80%] truncate ${
                      isMe ? 'text-right' : 'text-left'
                    }`}
                  >
                    Replying to:{' '}
                    <span className="text-white italic">
                      {(msg.replyTo as any).content || 'Photo'}
                    </span>
                  </div>
                )}

                <div className="relative flex items-end gap-1.5 max-w-[82%]">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-white text-black rounded-br-xs shadow-sm font-normal'
                        : 'bg-[#181818] text-white border border-[#292929] rounded-bl-xs'
                    }`}
                  >
                    {/* Image Attachment */}
                    {msg.attachment?.url && (
                      <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/20">
                        <img
                          src={msg.attachment.url}
                          alt="Attachment"
                          className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(msg.attachment!.url, '_blank')}
                        />
                      </div>
                    )}

                    {/* Text Content */}
                    {msg.content && <p className="break-words select-text">{msg.content}</p>}

                    {/* Timestamp & Receipts */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMe ? 'text-neutral-500' : 'text-[#71717A]'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMe && (
                        <span>
                          {msg.readAt ? (
                            <span className="flex text-black" title="Read">
                              <CheckIcon className="w-3 h-3 stroke-[2.5]" />
                              <CheckIcon className="w-3 h-3 -ml-2 stroke-[2.5]" />
                            </span>
                          ) : msg.deliveredAt ? (
                            <span className="flex text-neutral-400" title="Delivered">
                              <CheckIcon className="w-3 h-3 stroke-[2]" />
                              <CheckIcon className="w-3 h-3 -ml-2 stroke-[2]" />
                            </span>
                          ) : (
                            <CheckIcon className="w-3 h-3 stroke-[2]" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Action Options (Reply / Delete) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#71717A]">
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 hover:text-white"
                      title="Reply"
                    >
                      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    {isMe && (
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        className="p-1 hover:text-[#EF4444]"
                        title="Delete"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Partner Typing Indicator */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA] py-1">
            <Avatar
              src={partner?.profilePicture}
              name={partner?.name || 'Partner'}
              size="sm"
            />
            <div className="bg-[#181818] border border-[#292929] px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#111111] border-t border-[#292929] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2 truncate">
            <ArrowUturnLeftIcon className="w-4 h-4 text-white shrink-0" />
            <span className="truncate">
              Replying to: <strong className="text-white">{replyingTo.content || 'Photo'}</strong>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-[#71717A] hover:text-white"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Upload Preview */}
      {imagePreviewUrl && (
        <div className="relative px-4 py-2 bg-[#111111] border-t border-[#292929] flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#292929]">
            <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={handleClearImage}
              className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-[#A1A1AA]">Ready to send photo</span>
        </div>
      )}

      {/* Input Form Bar */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 bg-[#080808] border-t border-[#292929] flex items-center gap-2"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors shrink-0"
          title="Share Photo"
        >
          <PhotoIcon className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Message..."
          className="flex-1 bg-[#111111] text-white border border-[#292929] rounded-2xl px-4 py-2.5 text-sm placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
        />

        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || isUploading}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0 active:scale-95 shadow-sm"
          title="Send"
        >
          <PaperAirplaneIcon className="w-4 h-4 -rotate-45 ml-0.5" />
        </button>
      </form>
    </div>
  );
};
