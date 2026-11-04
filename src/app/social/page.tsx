'use client';

import React, { useEffect, useState } from 'react';
import { Share2, Heart, MessageCircle, Repeat2, Bookmark, Image as ImageIcon, Send } from 'lucide-react';
import { astraApi } from '@/src/lib/api-client';
import type { SocialPost, SocialStory } from '@/src/types/astraonyx';

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    astraApi.getPosts().then((res: any) => {
      if (res && res.posts) setPosts(res.posts);
      else if (Array.isArray(res)) setPosts(res);
    }).catch(() => {});

    astraApi.getStories().then((res: any) => {
      if (res && res.stories) setStories(res.stories);
      else if (Array.isArray(res)) setStories(res);
    }).catch(() => {});
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await astraApi.createPost({ content: newContent.trim() });
      setNewContent('');
      // Refresh posts
      const res: any = await astraApi.getPosts();
      if (res && res.posts) setPosts(res.posts);
    } catch (_) {}
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-purple-400 uppercase">
            POLARIUM • SOVEREIGN SOCIAL PLATFORM
          </span>
        </div>
        <h1 className="font-editorial text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
          Polarium Social Suite
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Feed status terdesentralisasi, stories efemeral 24 jam, dan pesan instan privat terenkripsi.
        </p>
      </div>

      {/* 24-Hour Stories Bar */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-400/50 flex items-center justify-center bg-cyan-500/10 group-hover:scale-105 transition-transform">
            <span className="text-xl text-cyan-400 font-light">+</span>
          </div>
          <span className="text-[11px] text-slate-400">Story Baru</span>
        </div>

        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 to-purple-500 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-black overflow-hidden flex items-center justify-center">
                <span className="text-xs font-bold text-slate-200">
                  {story.authorUsername?.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-300 max-w-[64px] truncate">{story.authorUsername}</span>
          </div>
        ))}
      </div>

      {/* Create Post Box */}
      <div className="glass-panel p-5">
        <form onSubmit={handlePost} className="space-y-4">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Bagikan pemikiran, kabar komunitas, atau pengumuman penting..."
            rows={3}
            className="w-full p-3.5 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
            >
              <ImageIcon size={15} />
              <span>Tambah Media</span>
            </button>
            <button
              type="submit"
              disabled={isLoading || !newContent.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-xs transition-all"
            >
              <Send size={12} />
              <span>Posting</span>
            </button>
          </div>
        </form>
      </div>

      {/* Feed Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500 text-sm">
            Belum ada postingan publik di feed Polarium.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-sm text-cyan-300">
                    {post.authorUsername?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{post.authorDisplayName || post.authorUsername}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">@{post.authorUsername}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              <div className="flex items-center gap-6 pt-3 border-t border-white/[0.04] text-slate-400 text-xs">
                <button type="button" className="flex items-center gap-1.5 hover:text-rose-400 transition-colors">
                  <Heart size={15} />
                  <span>{post.likesCount || 0}</span>
                </button>
                <button type="button" className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                  <MessageCircle size={15} />
                  <span>{post.commentsCount || 0}</span>
                </button>
                <button type="button" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                  <Repeat2 size={15} />
                </button>
                <button type="button" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors ml-auto">
                  <Bookmark size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
