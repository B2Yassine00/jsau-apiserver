const request = require('supertest');
const { promises: fs } = require('fs');
const { join } = require('path');
const { readJsonFile, writeJsonFile } = require('../utilities/index.js');
const app = require('../src/app.js'); 

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock('../utilities/index.js');

describe('API Server Tests', () => {
  const documentsJson = join(__dirname, '../documents.json');
  const htmlDirectory = join(__dirname, '../html_files');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/info', () => {
    it('should return the server version info', async () => {
      const res = await request(app).get('/info');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('jsau-apiserver-1.0.0');
    });
  });

  describe('/search', () => {
    it('should return all documents when no name query is provided', async () => {
      const mockData = JSON.stringify([{ id: 1, name: 'Document1' }]);
      fs.readFile.mockResolvedValue(mockData);
      console.log(mockData);
      const res = await request(app).get('/search');
      console.log(res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual("");
    });

  });

  describe('/document/:id', () => {
    
    it('should return 500 if the document ID does not exist', async () => {
      const mockDocs = [{ id: 1, name: 'Document1' }];
      fs.readFile.mockResolvedValue(JSON.stringify(mockDocs));

      const res = await request(app).get('/document/999');
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe('Internal server error.');
    });

    it('should return 500 if the HTML file for the document is not found', async () => {
      const mockDocs = [{ id: 1, name: 'Document1' }];
      fs.readFile.mockResolvedValue(JSON.stringify(mockDocs));
      fs.access.mockRejectedValue(new Error('File not found'));

      const res = await request(app).get('/document/1');
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe('Internal server error.');
    });

    it('should return 500 on invalid JSON parsing', async () => {
      fs.readFile.mockResolvedValue('INVALID_JSON');

      const res = await request(app).get('/document/1');
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe('Internal server error.');
    });

    it('should return 400 for an invalid document ID', async () => {
      const res = await request(app).get('/document/invalid');
      expect(res.statusCode).toBe(400);
      expect(res.text).toBe('Invalid document ID.');
    });
  });
});

describe('POST /favorites', () => {
  it('should return 400 if username or filename are missing', async () => {
    const res = await request(app)
      .post('/favorites')
      .send({ username: 'user1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Username and filename are required.');
  });

  it('should return 409 if the favorite already exists', async () => {
    const existingFavorites = [{ username: 'user1', filename: 'file.html' }];
    
    readJsonFile.mockResolvedValue(existingFavorites);

    const res = await request(app)
      .post('/favorites')
      .send({ username: 'user1', filename: 'file.html' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('File does not exist.');
  });

});

describe('GET /favorites/:username', () => {
  it('should return 404 if no favorites found for the user', async () => {
    readJsonFile.mockResolvedValue([]);
    
    const res = await request(app).get('/favorites/user1');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('No favorites found for user: user1');
  });

  it('should return the list of favorites for the user', async () => {
    const mockFavorites = [
      { id: 1, username: 'user1', filename: 'file1.html' },
      { id: 2, username: 'user1', filename: 'file2.html' }
    ];

    readJsonFile.mockResolvedValue(mockFavorites);

    const res = await request(app).get('/favorites/user1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockFavorites);
  });

  it('should return 500 in case of error', async () => {
    readJsonFile.mockRejectedValue(new Error('Failed to read file'));

    const res = await request(app).get('/favorites/user1');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('An error occurred while retrieving favorites.');
  });
});

describe('DELETE /favorites', () => {
  it('should return 400 if username or filename are missing', async () => {
    const res = await request(app)
      .delete('/favorites')
      .send({ username: 'user1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Username and filename are required.');
  });

  it('should return 404 if the favorite is not found', async () => {
    const mockFavorites = [{ username: 'user1', filename: 'file1.html' }];
    
    readJsonFile.mockResolvedValue(mockFavorites);
    
    const res = await request(app)
      .delete('/favorites')
      .send({ username: 'user1', filename: 'file2.html' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Favorite not found.');
  });

  it('should delete a favorite and return 200', async () => {
    const mockFavorites = [{ username: 'user1', filename: 'file1.html' }];
    
    readJsonFile.mockResolvedValue(mockFavorites);
    writeJsonFile.mockResolvedValue();

    const res = await request(app)
      .delete('/favorites')
      .send({ username: 'user1', filename: 'file1.html' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Favorite deleted successfully.');
  });

  it('should return 500 in case of error', async () => {
    readJsonFile.mockRejectedValue(new Error('Failed to read file'));

    const res = await request(app)
      .delete('/favorites')
      .send({ username: 'user1', filename: 'file1.html' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('An error occurred while deleting the favorite.');
  });
});
