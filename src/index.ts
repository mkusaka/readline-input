import * as readline from 'readline';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  id: number;
  sender: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: Date;
  edited?: boolean;
}

class ChatUI {
  private rl: readline.Interface;
  private messages: ChatMessage[] = [];
  private messageIdCounter: number = 0;
  private mode: 'chat' | 'edit' = 'chat';
  private editingMessageId: number | null = null;
  private currentStreamedContent: string = '';

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.initialize();
  }

  private initialize(): void {
    console.clear();
    console.log('OpenAIチャットを開始します。');
    console.log('コマンド一覧:');
    console.log('/edit [メッセージID] - メッセージを編集');
    console.log('/edit last - 最後のメッセージを編集');
    console.log('/list - メッセージ一覧を表示');
    console.log('Ctrl+D - 終了');
    this.displayPrompt();

    // システムメッセージを追加
    this.addMessage('system', 'こんにちは！AIアシスタントです。どのようなお手伝いができますか？');

    this.rl.on('line', async (input: string) => {
      if (input.trim()) {
        if (this.mode === 'edit') {
          await this.handleEditMode(input);
        } else {
          await this.handleChatMode(input);
        }
      }
      this.displayPrompt();
    });

    this.rl.on('close', () => {
      console.log('\nチャットを終了します。お疲れ様でした！');
      process.exit(0);
    });
  }

  private async handleChatMode(input: string): Promise<void> {
    if (input.startsWith('/edit')) {
      const args = input.split(' ');
      let messageId: number | null = null;

      if (args[1] === 'last') {
        const lastUserMessage = [...this.messages]
          .reverse()
          .find(m => m.sender === 'user');
        
        if (lastUserMessage) {
          messageId = lastUserMessage.id;
        } else {
          console.log('編集可能なメッセージが見つかりません。');
          return;
        }
      } else {
        messageId = parseInt(args[1]);
      }

      const targetMessage = this.messages.find(m => m.id === messageId);
      if (targetMessage) {
        if (targetMessage.sender !== 'user') {
          console.log('システムのメッセージは編集できません。');
          return;
        }
        this.mode = 'edit';
        this.editingMessageId = messageId;
        console.log(`メッセージID ${messageId} を編集します。`);
        console.log(`現在の内容: ${targetMessage.content}`);
        console.log('新しい内容を入力してください:');
        return;
      } else {
        console.log('指定されたメッセージIDが見つかりません。');
      }
    } else if (input === '/list') {
      this.displayChat();
      return;
    } else {
      // ユーザーメッセージを追加
      this.addMessage('user', input);
      
      try {
        // OpenAIにストリーミングリクエストを送信
        const stream = await openai.chat.completions.create({
          messages: this.messages.map(msg => ({
            role: msg.sender,
            content: msg.content
          })),
          model: 'gpt-3.5-turbo',
          stream: true,
        });

        // 新しいアシスタントメッセージを作成
        const assistantMessageId = ++this.messageIdCounter;
        this.currentStreamedContent = '';
        this.messages.push({
          id: assistantMessageId,
          sender: 'assistant',
          content: '',
          timestamp: new Date(),
        });

        // ストリーミングレスポンスを処理
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            this.currentStreamedContent += content;
            // メッセージを更新
            const messageIndex = this.messages.findIndex(m => m.id === assistantMessageId);
            if (messageIndex !== -1) {
              this.messages[messageIndex].content = this.currentStreamedContent;
            }
            // チャット表示を更新
            this.displayChat();
          }
        }
      } catch (error) {
        console.error('OpenAIのAPIでエラーが発生しました:', error);
        this.addMessage('system', 'エラーが発生しました。しばらく待ってから再度お試しください。');
      }
    }
    this.displayChat();
  }

  private async handleEditMode(input: string): Promise<void> {
    if (this.editingMessageId !== null) {
      const messageIndex = this.messages.findIndex(m => m.id === this.editingMessageId);
      if (messageIndex !== -1) {
        this.messages[messageIndex].content = input;
        this.messages[messageIndex].edited = true;
        console.log('メッセージを更新しました。');
        
        try {
          // ストリーミングレスポンスを使用
          const stream = await openai.chat.completions.create({
            messages: this.messages.map(msg => ({
              role: msg.sender,
              content: msg.content
            })),
            model: 'gpt-3.5-turbo',
            stream: true,
          });

          // 新しいアシスタントメッセージを作成
          const assistantMessageId = ++this.messageIdCounter;
          this.currentStreamedContent = '';
          this.messages.push({
            id: assistantMessageId,
            sender: 'assistant',
            content: '',
            timestamp: new Date(),
          });

          // ストリーミングレスポンスを処理
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              this.currentStreamedContent += content;
              // メッセージを更新
              const messageIndex = this.messages.findIndex(m => m.id === assistantMessageId);
              if (messageIndex !== -1) {
                this.messages[messageIndex].content = this.currentStreamedContent;
              }
              // チャット表示を更新
              this.displayChat();
            }
          }
        } catch (error) {
          console.error('OpenAIのAPIでエラーが発生しました:', error);
          this.addMessage('system', 'エラーが発生しました。しばらく待ってから再度お試しください。');
        }
      }
    }
    this.mode = 'chat';
    this.editingMessageId = null;
    this.displayChat();
  }

  private addMessage(sender: 'user' | 'system' | 'assistant', content: string): void {
    this.messages.push({
      id: ++this.messageIdCounter,
      sender,
      content,
      timestamp: new Date(),
    });
  }

  private displayChat(): void {
    console.clear();
    console.log('=== チャット履歴 ===\n');
    
    this.messages.forEach((msg) => {
      const time = msg.timestamp.toLocaleTimeString();
      const prefix = this.getSenderPrefix(msg.sender);
      const editedMark = msg.edited ? '(編集済み)' : '';
      console.log(`[${time}] ${prefix} (ID: ${msg.id}): ${msg.content} ${editedMark}`);
    });
    
    console.log('\n==================\n');
  }

  private getSenderPrefix(sender: 'user' | 'system' | 'assistant'): string {
    switch (sender) {
      case 'user':
        return '👤 You';
      case 'assistant':
        return '🤖 AI';
      case 'system':
        return '⚙️ System';
      default:
        return '';
    }
  }

  private displayPrompt(): void {
    const promptText = this.mode === 'edit' 
      ? '編集内容を入力してください > '
      : 'メッセージを入力してください > ';
    this.rl.setPrompt(promptText);
    this.rl.prompt();
  }
}

// チャットUIを開始
new ChatUI(); 
