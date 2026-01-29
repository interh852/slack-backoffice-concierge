import { handleSlackRequest } from '../SlackHandler';
import * as main from '../main';

jest.mock('../main');

// ContentServiceのモック
const mockSetContent = jest.fn().mockReturnThis();
const mockSetMimeType = jest.fn().mockReturnThis();
const mockGetContent = jest.fn();
const mockCreateTextOutput = jest.fn().mockReturnValue({
  setContent: mockSetContent,
  setMimeType: mockSetMimeType,
  getContent: mockGetContent,
});

(global as any).ContentService = {
  createTextOutput: mockCreateTextOutput,
  MimeType: {
    JSON: 'application/json',
  },
};

describe('SlackHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Slackからのリクエストを正常に処理してレスポンスを返すべき', () => {
    // Slackからのモックリクエストオブジェクト
    const e = {
      parameter: {
        user_id: 'U123456',
        user_name: 'tanaka',
      },
    } as any;

    const mockContent = JSON.stringify({
      response_type: 'ephemeral',
      text: '交通費の申請を受け付けました！'
    });
    mockGetContent.mockReturnValue(mockContent);

    const response = handleSlackRequest(e);

    expect(main.calculateAndSaveCommuteExpenses).toHaveBeenCalled();
    expect(mockCreateTextOutput).toHaveBeenCalled();
    
    const responseObj = JSON.parse(response.getContent());
    expect(responseObj.text).toContain('交通費の申請を受け付けました');
  });
});
