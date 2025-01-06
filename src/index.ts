import * as readline from 'readline';

interface ChatMessage {
  id: number;
  sender: 'user' | 'system';
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

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.initialize();
  }

  private initialize(): void {
    console.clear();
    console.log('チャットを開始します。');
    console.log('コマンド一覧:');
    console.log('/edit [メッセージID] - メッセージを編集');
    console.log('/edit last - 最後のメッセージを編集');
    console.log('/list - メッセージ一覧を表示');
    console.log('Ctrl+D - 終了');
    this.displayPrompt();

    this.rl.on('line', (input: string) => {
      if (input.trim()) {
        if (this.mode === 'edit') {
          this.handleEditMode(input);
        } else {
          this.handleChatMode(input);
        }
      }
      this.displayPrompt();
    });

    this.rl.on('close', () => {
      console.log('\nチャットを終了します。お疲れ様でした！');
      process.exit(0);
    });
  }

  private handleChatMode(input: string): void {
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
      // 通常のチャットメッセージを追加
      this.addMessage('user', input);
      const response = `Echo: ${input}`;
      this.addMessage('system', response);
    }
    this.displayChat();
  }

  private handleEditMode(input: string): void {
    if (this.editingMessageId !== null) {
      const messageIndex = this.messages.findIndex(m => m.id === this.editingMessageId);
      if (messageIndex !== -1) {
        this.messages[messageIndex].content = input;
        this.messages[messageIndex].edited = true;
        console.log('メッセージを更新しました。');
      }
    }
    this.mode = 'chat';
    this.editingMessageId = null;
    this.displayChat();
  }

  private addMessage(sender: 'user' | 'system', content: string): void {
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
      const prefix = msg.sender === 'user' ? '👤 You' : '🤖 Bot';
      const editedMark = msg.edited ? '(編集済み)' : '';
      console.log(`[${time}] ${prefix} (ID: ${msg.id}): ${msg.content} ${editedMark}`);
    });
    
    console.log('\n==================\n');
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
