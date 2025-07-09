let map; // グローバル変数として定義

// Remove the DOMContentLoaded wrapper and let getdata.js handle initialization
function init() {
	// dataが未定義なら何もしない
	if (typeof data === 'undefined' || !data.main || !data.main.values) {
		console.warn('data.main.values is not loaded yet.');
		return;
	}
	
	let lastClickedMarker = null; // 最後にクリックしたマーカーを追跡
	// 言語切り替え設定
	 let currentLanguage = 'japanese'; // 初期言語
	function setLanguage(language) {
		currentLanguage = language;
		regenerateLeftPanel(); // 左パネルを再生成
	}

	function updateTextContent() { // ここを追加
		const elements = document.querySelectorAll('[data-japanese], [data-english]');
		elements.forEach(element => {
			if (currentLanguage === 'japanese') {
				element.textContent = element.getAttribute('data-japanese');
			} else {
				element.textContent = element.getAttribute('data-english');
			}
		});
	}

	// Replace language button event listener with toggle
	document.getElementById('languageToggle').addEventListener('change', function(e) {
		const newLanguage = e.target.checked ? 'english' : 'japanese';
		// Update all translatable elements
		document.querySelectorAll('[data-ja], [data-en]').forEach(element => {
			element.textContent = element.getAttribute(newLanguage === 'english' ? 'data-en' : 'data-ja');
		});
		setLanguage(newLanguage);
		
		// Update tools button text
		const isVisible = mapTools.classList.contains('visible');
		toolsToggle.textContent = newLanguage === 'english' 
			? (isVisible ? 'Show Tools' : 'Hide Tools')
			: (isVisible ? 'ツールを表示' : 'ツール非表示');
	});

	// 初期メッセージを設定
	  document.getElementById('info').innerHTML = '言語の選択とアイコンをクリックまたはタップして詳細を表示';
		const element = document.getElementById('info');

		// 要素の位置を少し下げる
		element.style.marginTop = '20px';

	// すべてのマーカーの平均緯度と経度を計算
	let latSum = 0;
	let lonSum = 0;

	// Mapboxのアクセストークン
	// mapboxgl.accessToken = 'pk.eyJ1IjoieW9oamFwYW4iLCJhIjoiY2xnYnRoOGVmMDFsbTNtbzR0eXV6a2IwZCJ9.kJYURwlqIx_cpXvi66N0uw';

	// データを取得
	let rows = data.main.values;
	let markers = [];
	initMap();

	// current marker idの変数
	let currentMarkerId = null;

	function initMap(preservePosition = false) {
		// Calculate initial center coordinates regardless of preservePosition
		latSum = 0;
		lonSum = 0;
		let validPoints = 0;

		let bounds = new maplibregl.LngLatBounds();

		rows.forEach(row => {
			const [, , , , lat, lon] = row;
			if (lat && lon) {
			latSum += parseFloat(lat);
			lonSum += parseFloat(lon);
			validPoints++;
			bounds.extend([parseFloat(lon), parseFloat(lat)]);
			}
		});

		// Default center coordinates if no valid points
		let centerLat = 35.60651518008034;  // Default latitude
		let centerLon = 140.118780167884; // Default longitude

		if (validPoints > 0) {
			centerLat = latSum / validPoints;
			centerLon = lonSum / validPoints;
		}

		// Get current view state if preserving position
		const currentCenter = preservePosition && map ? map.getCenter() : null;
		const currentZoom = preservePosition && map ? map.getZoom() : null;

		// Clear existing markers
		markers.forEach(marker => marker.remove());
		markers = [];

		// Initialize or update map
		if (!map) {
			map = new maplibregl.Map({
				container: 'map',
				style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // ← ここをCartoスタイルに変更
				center: [centerLon, centerLat],
				// zoom: 15  // ← この行はコメントのまま
			});
			if (validPoints > 0) {
				// マーカー全体が収まるようにfitBoundsで表示
				map.fitBounds(bounds, { padding: 40, animate: false });
			}
		} else if (!preservePosition) {
			map.setCenter([centerLon, centerLat]);
			if (validPoints > 0) {
				map.fitBounds(bounds, { padding: 40, animate: false });
			}
		}

		// Restore previous view if preserving position
		if (preservePosition && currentCenter && currentZoom) {
			map.setCenter(currentCenter);
			map.setZoom(currentZoom);
		}

		// マーカーをマップに追加
		rows.forEach((row, index) => {
			const [id, category, jName, eName, lat, lon, link, linkname] = row;

			const markerConfig = {
				0: { image: `shrine-${id}-1.jpg`, size: '40px', radius: '50%', zIndex: '1000' }
			};

			const customMarker = document.createElement('div');
			const config = markerConfig[category] || { 
				image: `shrine-${id}-1.jpg`, 
				size: '40px', 
				radius: '50%',
				zIndex: index
			};

			// 初期は青ピン
			Object.assign(customMarker.style, {
				backgroundImage: `url(images/pin_blue.png)`,
				width: config.size,
				height: config.size,
				zIndex: config.zIndex || index,
				backgroundSize: 'cover',
				cursor: 'pointer',
				// 下端を座標に合わせる
				transform: 'translate(-50%, -100%)',
				position: 'absolute'
			});

			const marker = new maplibregl.Marker({
				element: customMarker,
				anchor: 'bottom'
			})
				.setLngLat([parseFloat(lon), parseFloat(lat)])
				.addTo(map);

			markers.push(marker);
			customMarker.title = currentLanguage === 'japanese' ? jName : eName;

			marker.getElement().addEventListener('click', () => {
				// すべてのマーカーを青ピンに戻す
				markers.forEach(m => {
					m.getElement().style.backgroundImage = `url(images/pin_blue.png)`;
				});
				// このマーカーだけ赤ピン
				customMarker.style.backgroundImage = `url(images/pin_red.png)`;

				// マーカーを中心にズーム
				map.flyTo({
					center: [parseFloat(lon), parseFloat(lat)],
					zoom: 17,
					speed: 1.2,
					curve: 1.5,
					essential: true
				});

				// If same marker is clickedまたはタップして詳細を表示
				if (lastClickedMarker === marker) {
					document.getElementById('info').innerHTML = 'マーカーをクリックまたはタップして詳細を表示';
					lastClickedMarker = null;
				} else {					
					// スライドショー用のHTMLを生成
					const numPhotos = parseInt(row[8]) || 1; // numphotosの値（8番目のカラム）
					let slideshowHTML = '';
					
					if (numPhotos > 1) {
						slideshowHTML = `
							<div class="slideshow-container">
								<div class="slides">
									${Array.from({length: numPhotos}, (_, i) => 
										`<img src="images/${id}-${i+1}.jpg" onerror="this.style.display='none'">`
									).join('')}
								</div>
								<button class="prev" onclick="changeSlide(this, -1)">❮</button>
								<button class="next" onclick="changeSlide(this, 1)">❯</button>
								<div class="dots-container">
									${Array.from({length: numPhotos}, (_, i) => 
										`<span class="dot" onclick="currentSlide(this, ${i+1})"></span>`
									).join('')}
								</div>
							</div>
						`;
					} else {
						slideshowHTML = `<img src="images/${id}-1.jpg" style="width: auto; height: auto; object-fit: cover;" onerror="this.style.display='none'">`;
					}

					// linkが有効なURLかチェック
					let iframeHTML = '';
					if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
						iframeHTML = `<iframe src="${link}" width="100%" height="400" style="border:none; overflow-x:hidden !important; margin-top: 10px;"></iframe>`;
					}

					document.getElementById('info').innerHTML = `
						<h2>${currentLanguage === 'japanese' ? jName : eName}</h2>
						${link && (link.startsWith('http://') || link.startsWith('https://')) ? `<a href="${link}" target="_blank">${linkname || 'リンク'}</a>` : ''}
						${slideshowHTML}
						${iframeHTML}
					`;
					
					// スライドショーを初期化
					if (numPhotos > 1) {
						setTimeout(() => initSlideshow(), 100);
					}
					
					lastClickedMarker = marker;
				}

				currentMarkerId = id;
				const leftPanel = document.getElementById('left-panel');
				
				// Remove closed class to show panel
				leftPanel.classList.remove('closed');
				document.body.classList.add('panel-open');
				
				// Adjust map height for mobile
				if (window.innerWidth <= 767) {
					setTimeout(() => {
						map.resize();
					}, 300);
				}
			});
		});

		
	}
	// create a function that regenerates the left panel based on the current marker id
	function regenerateLeftPanel() {
		// find the row that matches the current marker id
		const row = rows.find(row => row[0] === currentMarkerId);
		if (!row) return; // if no row is found, exit the function

		const [id, category, jName, eName, lat, lon, link, linkname] = row;

		const name = currentLanguage === 'japanese' ? jName : eName;
		
		// linkが有効なURLかチェック
		let iframeHTML = '';
		if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
			iframeHTML = `<iframe src="${link}" width="100%" height="400" style="border:none;"></iframe>`;
		}
		
		document.getElementById('info').innerHTML = `
			<h2>${name}</h2>
			${link && (link.startsWith('http://') || link.startsWith('https://')) ? `<a href="${link}" target="_blank">${linkname || 'リンク'}</a>` : ''}
			${iframeHTML}
		`;
	}

	// 初期設定;

	// Replace dropdown event listener with checkbox handler
	const markerFilter = document.getElementById('marker-filter');
	markerFilter.addEventListener('change', function(e) {
		console.log('Checkbox changed');
		if (!e.target.matches('input[type="checkbox"]')) return;
		
		// Get all checked categories
		const checkedCategories = Array.from(markerFilter.querySelectorAll('input[type="checkbox"]:checked'))
			.map(checkbox => parseInt(checkbox.value));
		
		// Filter rows to show only checked categories
		rows = data.main.values.filter(row => checkedCategories.includes(parseInt(row[1])));
		
		initMap(true); // Pass true to preserve position
	});

	// Add check all/uncheck all functionality
	document.getElementById('check-all').addEventListener('click', (e) => {
		e.preventDefault();
		markerFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = true;
		});
		// Update the markers
		rows = data.main.values;
		initMap(true);
	});

	document.getElementById('uncheck-all').addEventListener('click', (e) => {
		e.preventDefault();
		markerFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = false;
		});
		// Clear all markers
		rows = [];
		initMap(true);
	});

	// Add tools panel toggle functionality
	const toolsToggle = document.getElementById('tools-toggle');
	const mapTools = document.getElementById('map-tools');
	
	toolsToggle.addEventListener('click', () => {
		const isVisible = mapTools.classList.contains('visible');
		mapTools.classList.toggle('visible');
		toolsToggle.textContent = currentLanguage === 'japanese' 
			? (isVisible ? 'ツールを表示' : 'ツールを非表示')
			: (isVisible ? 'Show tools' : 'Hide tools');
	});
	
	// Add left-panel close button functionality
	const leftPanel = document.getElementById('left-panel');
	const leftPanelClose = document.getElementById('left-panel-close');
	if (leftPanelClose) {
		leftPanelClose.addEventListener('click', () => {
			leftPanel.classList.add('closed');
			document.body.classList.remove('panel-open');
			// 最後にクリックしたマーカーを青ピンに戻す
			if (lastClickedMarker && lastClickedMarker.getElement) {
				lastClickedMarker.getElement().style.backgroundImage = `url(images/pin_blue.png)`;
				lastClickedMarker = null;
			}
			// マップを初期位置・初期ズーム（全マーカーが収まるサイズ）に戻す
			if (map && rows && rows.length > 0) {
				let fitBounds = new maplibregl.LngLatBounds();
				rows.forEach(row => {
					const [, , , , lat, lon] = row;
					if (lat && lon) {
						fitBounds.extend([parseFloat(lon), parseFloat(lat)]);
					}
				});
				if (!fitBounds.isEmpty()) {
					map.fitBounds(fitBounds, { padding: 40 });
				} else {
					map.flyTo({
						center: [140.118780167884, 35.60651518008034],
						zoom: 4,
						speed: 1.2,
						curve: 1.5,
						essential: true
					});
				}
			}
			// 必要ならマップリサイズ
			if (window.innerWidth <= 767 && map) {
				setTimeout(() => {
					map.resize();
				}, 300);
			}
		});
	}
}

// スライドショー関数をグローバルに追加
window.changeSlide = function(button, direction) {
	const container = button.closest('.slideshow-container');
	const slides = container.querySelectorAll('.slides img');
	const dots = container.querySelectorAll('.dot');
	let currentIndex = Array.from(slides).findIndex(slide => slide.style.display !== 'none');
	
	if (currentIndex === -1) currentIndex = 0;
	
	slides[currentIndex].style.display = 'none';
	dots[currentIndex].classList.remove('active');
	
	currentIndex += direction;
	if (currentIndex >= slides.length) currentIndex = 0;
	if (currentIndex < 0) currentIndex = slides.length - 1;
	
	slides[currentIndex].style.display = 'block';
	dots[currentIndex].classList.add('active');
};

window.currentSlide = function(dot, slideIndex) {
	const container = dot.closest('.slideshow-container');
	const slides = container.querySelectorAll('.slides img');
	const dots = container.querySelectorAll('.dot');
	
	slides.forEach(slide => slide.style.display = 'none');
	dots.forEach(d => d.classList.remove('active'));
	
	slides[slideIndex - 1].style.display = 'block';
	dots[slideIndex - 1].classList.add('active');
};

function initSlideshow() {
	const slides = document.querySelectorAll('.slides img');
	const dots = document.querySelectorAll('.dot');
	if (slides.length > 0) {
		slides[0].style.display = 'block';
		if (dots.length > 0) dots[0].classList.add('active');
	}
}