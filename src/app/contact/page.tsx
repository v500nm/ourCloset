'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';
import { Footer } from '@/components/layout/Footer';

import { Button } from '@/components';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-32 pb-24 px-6 w-full max-w-xl mx-auto">
        <div className="text-center mb-12">
          <span className="material-symbols-outlined text-secondary text-5xl mb-4">mail</span>
          <h1 className="font-display text-4xl text-primary font-bold mb-4">Get in Touch</h1>
          <p className="text-on-surface-variant">
            Have questions about household setup or subscription tiers? Reach out below.
          </p>
        </div>

        <form className="bg-surface-container rounded-3xl p-8 border border-outline-variant/30 shadow-lg space-y-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-2" htmlFor="name">Name</label>
            <input 
              type="text" 
              id="name" 
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-colors" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-2" htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-colors" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-2" htmlFor="message">Message</label>
            <textarea 
              id="message" 
              rows={4}
              placeholder="How can we help?"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-colors resize-none" 
            />
          </div>
          <Button type="button" className="w-full justify-center py-4 bg-primary text-on-primary">
            Send Message
          </Button>
        </form>
      </main>
      <Footer />
      <TabBar />
    </div>
  );
}
