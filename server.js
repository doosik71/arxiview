const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors());

// JSON 파싱
app.use(express.json());

// 정적 파일 제공 (React 빌드된 파일들)
app.use(express.static(path.join(__dirname, 'public')));

// arxivjsdata 폴더 경로
const ARXIV_DATA_PATH = path.join(__dirname, 'public', 'arxivjsdata');

// API: 카테고리 목록 가져오기
app.get('/api/categories', (req, res) => {
  try {
    if (!fs.existsSync(ARXIV_DATA_PATH)) {
      return res.status(404).json({ error: 'arxivjsdata directory not found' });
    }

    const categories = fs.readdirSync(ARXIV_DATA_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name)
      .sort();

    res.json({ categories });
  } catch (error) {
    console.error('Error reading categories:', error);
    res.status(500).json({ error: 'Failed to read categories' });
  }
});

// API: 특정 카테고리의 파일 목록 가져오기
app.get('/api/categories/:category/files', (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const categoryPath = path.join(ARXIV_DATA_PATH, category);

    if (!fs.existsSync(categoryPath)) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const files = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => {
        const filePath = path.join(categoryPath, dirent.name);
        const stats = fs.statSync(filePath);
        
        // JSON 파일의 메타데이터 읽기
        let metadata = null;
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(fileContent);
          metadata = {
            title: jsonData.title || 'No title',
            authors: jsonData.authors || 'Unknown authors',
            year: jsonData.year || 'Unknown year',
            abstract: jsonData.abstract || '',
            url: jsonData.url || ''
          };
        } catch (parseError) {
          console.error(`Error parsing ${dirent.name}:`, parseError);
          metadata = {
            title: dirent.name.replace('.json', ''),
            authors: 'Unknown authors',
            year: 'Unknown year',
            abstract: '',
            url: ''
          };
        }

        return {
          name: dirent.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          type: 'json',
          ...metadata
        };
      });

    res.json({ files });
  } catch (error) {
    console.error('Error reading category files:', error);
    res.status(500).json({ error: 'Failed to read category files' });
  }
});

// API: 특정 JSON 파일 내용 가져오기
app.get('/api/categories/:category/files/:filename', (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const filename = req.params.filename;
    const filePath = path.join(ARXIV_DATA_PATH, category, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    res.json(jsonData);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// 모든 다른 요청은 React 앱으로 전달
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`ArXiv data path: ${ARXIV_DATA_PATH}`);
});