import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import './App.css';

function App() {
  const [papers, setPapers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('folder');
  const [currentPath, setCurrentPath] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [arxivData, setArxivData] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState({});

  useEffect(() => {
    loadArxivFolderStructure();
  }, []);

  const loadArxivFolderStructure = async () => {
    setLoading(true);
    try {
      const structure = await getArxivFolderStructure();
      console.log('Loaded structure:', structure);
      setArxivData(structure);
    } catch (error) {
      console.error('Error loading folder structure:', error);
      setArxivData({});
    } finally {
      setLoading(false);
    }
  };

  const getArxivFolderStructure = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      if (response.ok) {
        const data = await response.json();
        const structure = {};

        // 각 카테고리를 빈 객체로 초기화 (파일은 클릭할 때 로드)
        for (const category of data.categories) {
          structure[category] = {};
        }

        console.log('Found categories from API:', Object.keys(structure));
        return structure;
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // 백엔드 서버가 없는 경우 폴백
      return getFallbackCategories();
    }
  };

  const getFallbackCategories = () => {
    const fallbackCategories = [
      'AI Healthcare',
      'Anomaly Detection',
      'Binary Neural Networks',
      'Energy Score',
      'Object Detection',
      'Semantic Segmentation'
    ];

    const structure = {};
    for (const category of fallbackCategories) {
      structure[category] = {};
    }

    console.log('Using fallback categories:', Object.keys(structure));
    return structure;
  };

  const loadCategoryFiles = async (category) => {
    try {
      const response = await fetch(`http://localhost:3001/api/categories/${encodeURIComponent(category)}/files`);

      if (response.ok) {
        const data = await response.json();
        const files = {};

        // API에서 받은 파일 데이터를 변환
        data.files.forEach(file => {
          files[file.name] = {
            type: 'json',
            title: file.title,
            authors: file.authors,
            year: file.year,
            abstract: file.abstract,
            url: file.url,
            size: file.size,
            modified: file.modified
          };
        });

        console.log(`Loaded ${Object.keys(files).length} files for ${category} from API`);
        return files;
      } else {
        throw new Error('Failed to fetch category files');
      }
    } catch (error) {
      console.error(`Error fetching files for ${category}:`, error);
      // 백엔드 서버가 없는 경우 폴백
      return getFallbackCategoryFiles(category);
    }
  };

  const getFallbackCategoryFiles = async (category) => {
    const files = {};

    // 백엔드가 없을 때 사용할 폴백 파일들
    const categoryFiles = {
      'AI Healthcare': [
        'aHR0cDovL2FyeGl2Lm9yZy9hYnMvMjIxMS4wMjcwMXYx.json'
      ],
      'Binary Neural Networks': [
        'aHR0cDovL2FyeGl2Lm9yZy9hYnMvMDkwNC40NTg3djE=.json'
      ],
      'Energy Score': [
        'aHR0cDovL2FyeGl2Lm9yZy9hYnMvMjEwNC4xNDcyNnYx.json'
      ]
    };

    const testFiles = categoryFiles[category] || [];

    for (const fileName of testFiles) {
      try {
        const jsonUrl = `/arxivjsdata/${encodeURIComponent(category)}/${fileName}`;
        const jsonResponse = await fetch(jsonUrl);
        if (jsonResponse.ok) {
          const jsonData = await jsonResponse.json();
          files[fileName] = {
            type: 'json',
            title: jsonData.title,
            authors: jsonData.authors,
            year: jsonData.year,
            abstract: jsonData.abstract,
            url: jsonData.url
          };
        }
      } catch (jsonError) {
        console.error(`Error loading fallback file ${fileName}:`, jsonError);
      }
    }

    console.log(`Loaded ${Object.keys(files).length} fallback files for ${category}`);
    return files;
  };

  const loadPapersFromCategory = async (category) => {
    const papers = [];
    const categoryData = arxivData[category];

    if (!categoryData) return papers;

    for (const [fileName, fileInfo] of Object.entries(categoryData)) {
      if (fileInfo.type === 'json') {
        try {
          const response = await fetch(`/arxivjsdata/${encodeURIComponent(category)}/${fileName}`);
          if (response.ok) {
            const paperData = await response.json();
            papers.push({
              ...paperData,
              category: category,
              fileName: fileName
            });
          }
        } catch (error) {
          console.error(`Error loading ${fileName}:`, error);
        }
      }
    }

    // 논문 로드 후 markdown 파일들도 로드
    await loadMarkdownFiles(papers);

    return papers;
  };

  const loadMarkdownFiles = async (papers) => {
    const newMarkdownContent = {};

    for (const paper of papers) {
      const markdownFileName = paper.fileName.replace('.json', '.md');
      const markdownUrl = `/arxivjsdata/${encodeURIComponent(paper.category)}/${markdownFileName}`;

      try {
        const response = await fetch(markdownUrl);

        if (response.ok) {
          let markdownText = await response.text();

          if (markdownText.trim()) {
            markdownText = markdownText
              .replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => `<pre><code="latex_math_2">${inner}</code></pre>`)
              .replace(/\$([^\n\r$]+?)\$/g, (_, inner) => `<pre><code="latex_math_1">${inner}</code></pre>`);

            let htmlContent = marked(markdownText, { "mangle": false, headerIds: false });

            htmlContent = htmlContent
              .replace(/<pre><code="latex_math_1">([^\n\r$]+?)<\/code><\/pre>/g, (_, inner) => `$${inner}$`)
              .replace(/<pre><code="latex_math_2">([\s\S]+?)<\/code><\/pre>/g, (_, inner) => `$$${inner}$$`)
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            newMarkdownContent[paper.fileName] = htmlContent;
          }
        }
      } catch (error) {
        console.error(`Error loading markdown ${markdownFileName}:`, error);
      }
    }
    setMarkdownContent(prev => ({ ...prev, ...newMarkdownContent }));
    
    // MathJax 재렌더링
    if (window.MathJax && window.MathJax.typesetPromise) {
      setTimeout(() => {
        window.MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
      }, 100);
    }
  };

  const handleSearch = () => {
    const filtered = papers.filter(paper =>
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.abstract.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setPapers(filtered);
  };

  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const navigateToFolder = async (path) => {
    setCurrentPath(path);

    if (path.length === 1) {
      const category = path[0];
      if (!arxivData[category] || Object.keys(arxivData[category]).length === 0) {
        const files = await loadCategoryFiles(category);
        setArxivData(prev => ({
          ...prev,
          [category]: files
        }));
      }
    }
  };

  const getCurrentData = () => {
    if (currentPath.length === 0) {
      return arxivData;
    }

    const categoryName = currentPath[0];
    const categoryData = arxivData[categoryName];

    if (!categoryData) {
      console.log(`No data found for category: ${categoryName}`);
      return {};
    }

    console.log(`Current path: ${currentPath.join('/')}, Category data:`, categoryData);
    return categoryData;
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumbs">
        <span
          className="breadcrumb-item"
          onClick={() => setCurrentPath([])}
        >
          arxivjsdata
        </span>
        {currentPath.map((folder, index) => (
          <span key={index}>
            <span className="breadcrumb-separator"> / </span>
            <span
              className="breadcrumb-item"
              onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
            >
              {folder}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const renderFolderView = () => {
    if (loading) {
      return (
        <div className="folder-view">
          <div className="loading">데이터를 로딩 중...</div>
        </div>
      );
    }

    const currentData = getCurrentData();
    console.log('Rendering folder view with data:', currentData);
    console.log('Current path:', currentPath);

    // 검색어로 폴더/파일 필터링
    const filteredData = Object.entries(currentData || {}).filter(([name, content]) => {
      if (!folderSearchTerm) return true;

      const isFolder = currentPath.length === 0 && !content.type;
      const searchTarget = isFolder ? name : (content.title || name);
      return searchTarget.toLowerCase().includes(folderSearchTerm.toLowerCase());
    });

    return (
      <div className="folder-view">
        {renderBreadcrumbs()}

        <div className="folder-search">
          <input
            type="text"
            placeholder="폴더 검색..."
            value={folderSearchTerm}
            onChange={(e) => setFolderSearchTerm(e.target.value)}
            className="folder-search-input"
          />
        </div>

        <div className="folder-contents">
          {filteredData.length === 0 ? (
            <div className="no-data">
              {Object.entries(currentData || {}).length === 0 ? '데이터가 없습니다.' : '검색 결과가 없습니다.'}
            </div>
          ) : (
            filteredData.map(([name, content]) => {
              const isFolder = currentPath.length === 0 && !content.type;
              const isExpanded = expandedFolders.has(name);

              return (
                <div key={name} className="folder-item">
                  <div
                    className={`folder-header ${isFolder ? 'folder' : 'file'}`}
                    onClick={async () => {
                      if (isFolder) {
                        if (currentPath.length === 0) {
                          await navigateToFolder([name]);
                        } else {
                          const categoryPapers = await loadPapersFromCategory(name);
                          setPapers(categoryPapers);
                          setActiveMenu('document');
                        }
                      } else {
                        const paperData = {
                          ...content,
                          category: currentPath[0] || 'Unknown',
                          fileName: name
                        };
                        setPapers([paperData]);
                        // 개별 논문 선택 시에도 markdown 로드
                        await loadMarkdownFiles([paperData]);
                        setActiveMenu('document');
                      }
                    }}
                  >
                    <span className="folder-icon">
                      {isFolder ? (
                        currentPath.length === 0 ? (
                          isExpanded ? '📂' : '📁'
                        ) : '📁'
                      ) : '📄'}
                    </span>
                    <span className="folder-name">{isFolder ? name : (content.title || name)}</span>
                    {!isFolder && content.year && (
                      <div className="file-details">
                        <span className="file-authors">{content.authors}</span>
                        <span className="file-year">{content.year}</span>
                      </div>
                    )}
                  </div>

                  {isFolder && isExpanded && currentPath.length === 0 && (
                    <div className="subfolder-list">
                      {Object.entries(content).map(([subName, subContent]) => (
                        <div
                          key={subName}
                          className="subfolder-item"
                          onClick={async () => {
                            const categoryPapers = await loadPapersFromCategory(name);
                            setPapers(categoryPapers);
                            setActiveMenu('document');
                          }}
                        >
                          <span className="folder-icon">📁</span>
                          <span className="folder-name">{subName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }))
          }
        </div>
      </div>
    );
  };

  const renderPapersView = () => {
    return (
      <div className="papers-view">
        <div className="papers-header">
          <button
            className="back-to-folder-btn"
            onClick={() => {
              setPapers([]);
              setActiveMenu('folder');
            }}
            title="폴더 보기로 돌아가기"
          >
            ← 폴더로 돌아가기
          </button>
        </div>

        <div className="papers-list">
          {papers.map((paper, index) => (
            <div key={index} className="paper-item">
              <h3 className="paper-title">{paper.title}</h3>
              <div className="paper-meta">
                <span className="paper-year">발표연도: {paper.year}</span>
                <span className="paper-authors">저자: {paper.authors}</span>
              </div>
              <p className="paper-abstract">{paper.abstract}</p>
              <div className="paper-bottom">
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link"
                >
                  ArXiv에서 보기
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Markdown 콘텐츠 표시 */}
        {papers.length > 0 && (
          <div className="markdown-content">
            {papers.map((paper, index) => {
              const hasMarkdown = markdownContent[paper.fileName];

              return hasMarkdown ? (
                <div key={index} className="markdown-paper">
                  <div
                    className="markdown-html"
                    dangerouslySetInnerHTML={{ __html: markdownContent[paper.fileName] }}
                  />
                </div>
              ) : (
                <div key={index} className="markdown-paper">
                  <h3 className="markdown-paper-title">{paper.title}</h3>
                  <div className="markdown-html">
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      해당 논문의 상세 내용을 찾을 수 없습니다. (파일: {paper.fileName.replace('.json', '.md')})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMainContent = () => {
    switch (activeMenu) {
      case 'folder':
        return renderFolderView();

      case 'document':
        // papers가 있으면 논문 목록을 보여주고, 없으면 문서 관리 화면을 보여줌
        if (papers.length > 0) {
          return renderPapersView();
        }
        return (
          <div className="document-view">
            <h2>문서 관리</h2>
            <div className="document-sections">
              <div className="document-card">
                <h3>내 문서</h3>
                <p>저장된 문서: 12개</p>
                <ul>
                  <li>Machine Learning Fundamentals</li>
                  <li>Deep Learning Research</li>
                  <li>Computer Vision Applications</li>
                </ul>
              </div>

              <div className="document-card">
                <h3>즐겨찾기</h3>
                <p>즐겨찾기한 논문: 8개</p>
                <ul>
                  <li>Attention Is All You Need</li>
                  <li>ResNet Paper</li>
                  <li>BERT: Pre-training</li>
                </ul>
              </div>

              <div className="document-card">
                <h3>최근 읽음</h3>
                <p>지난 7일간 읽은 논문</p>
                <ul>
                  <li>A Novel Approach to Machine Learning</li>
                  <li>Deep Learning for Computer Vision</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="settings-view">
            <h2>설정</h2>
            <div className="settings-sections">
              <div className="settings-group">
                <h3>계정 설정</h3>
                <div className="setting-item">
                  <label>사용자명</label>
                  <input type="text" defaultValue="Doosik Kim" />
                </div>
                <div className="setting-item">
                  <label>이메일</label>
                  <input type="email" defaultValue="doosik@example.com" />
                </div>
              </div>

              <div className="settings-group">
                <h3>화면 설정</h3>
                <div className="setting-item">
                  <label>테마</label>
                  <select>
                    <option>라이트 모드</option>
                    <option>다크 모드</option>
                    <option>자동</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>글꼴 크기</label>
                  <select>
                    <option>작게</option>
                    <option>보통</option>
                    <option>크게</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <h3>알림 설정</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    새 논문 알림
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    업데이트 알림
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-menu">
          <button
            className={`menu-item ${activeMenu === 'folder' ? 'active' : ''}`}
            onClick={() => setActiveMenu('folder')}
          >
            <span className="menu-icon">📁</span>
            <span className="menu-label">폴더 보기</span>
          </button>
          <button
            className={`menu-item ${activeMenu === 'document' ? 'active' : ''}`}
            onClick={() => setActiveMenu('document')}
          >
            <span className="menu-icon">📄</span>
            <span className="menu-label">논문 보기</span>
          </button>
          <button
            className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveMenu('settings')}
          >
            <span className="menu-icon">⚙️</span>
            <span className="menu-label">설정 보기</span>
          </button>
        </div>
      </aside>

      <div className={`main-content ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
        <header className="App-header">
          <h1>Arxiview</h1>
        </header>

        <main className="App-main">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

export default App;