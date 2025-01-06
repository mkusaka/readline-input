import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';

class ChatUI {
  private rl: readline.Interface;
  private messages: { role: 'user' | 'system', content: string }[] = [];

  constructor() {
    this.rl = readline.createInterface({ input, output });
    this.initialize();
  }

  private initialize(): void {
    console.log('チャットを開始します。終了するには Ctrl+D を押してください。');
    
    // closeイベントリスナーを一度だけ設定
    this.rl.on('close', () => {
      console.log('\nチャットを終了します。');
      process.exit(0);
    });

    this.startChat();
  }

  private startChat(): void {
    this.rl.question('あなた > ', (input) => {
      if (input.trim()) {
        this.messages.push({ role: 'user', content: input });
        this.simulateResponse();
      }
      this.startChat();
    });
  }

  private simulateResponse(): void {
    const response = `あなたのメッセージ "${this.messages[this.messages.length - 1].content}" を受け取りました。`;
    this.messages.push({ role: 'system', content: response });
    console.log(`YUKI.N > ${response}`);
  }
}

// チャットUIを開始
new ChatUI(); 
