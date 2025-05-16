let map; // グローバル変数として定義

// Remove the DOMContentLoaded wrapper and let getdata.js handle initialization
function init() {

	let slideIndex = 1;

	function plusSlides(n) {
		showSlides(slideIndex += n);
	}

	function showSlides(n) {
		let i;
		let slides = document.getElementsByClassName("mySlides");
		if (slides.length === 0) return; // スライドが存在しない場合は処理をスキップ
		if (n > slides.length) {slideIndex = 1}
		if (n < 1) {slideIndex = slides.length}
		for (i = 0; i < slides.length; i++) {
			slides[i].style.display = "none";  
		}
		slides[slideIndex-1].style.display = "block";  
	}

	// 矢印ボタンのクリックイベントを設定
	document.addEventListener('click', (event) => {
		if (event.target.matches('.prev')) {
			plusSlides(-1);
		} else if (event.target.matches('.next')) {
			plusSlides(1);
		}
	});
	
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
			? (isVisible ? 'Tools' : 'Show Tools')
			: (isVisible ? 'ツール' : 'ツールを表示');
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
	mapboxgl.accessToken = 'pk.eyJ1IjoieW9oamFwYW4iLCJhIjoiY2xnYnRoOGVmMDFsbTNtbzR0eXV6a2IwZCJ9.kJYURwlqIx_cpXvi66N0uw';

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

		let bounds = new mapboxgl.LngLatBounds();

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
			map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/mapbox/standard',			
			center: [centerLon, centerLat],
			// zoom: 15
			});
			if (validPoints > 0) {
			map.fitBounds(bounds, { padding: 40 });
			}
		} else if (!preservePosition) {
			map.setCenter([centerLon, centerLat]);
			if (validPoints > 0) {
			map.fitBounds(bounds, { padding: 40 });
			}
		}

		// Restore previous view if preserving position
		if (preservePosition && currentCenter && currentZoom) {
			map.setCenter(currentCenter);
			map.setZoom(currentZoom);
		}

		// マーカーをマップに追加
		rows.forEach((row, index) => {
			const [id, category, jName, eName, lat, lon, jDescription, eDescription, link, linkname, numphotos] = row;
			
			const rphotos = Array.from({length: numphotos}, (_, i) => 
				`<div class="mySlides fade"><img src="images/reitaku-${id}-${i + 1}.jpg" style="width:100%;height:350px;object-fit:cover"></div>`
			).join('');

			const markerConfig = {
				0: { image: `reitaku-${id}-1.jpg`, size: '40px', radius: '50%', zIndex: '1000' }
			};

			const customMarker = document.createElement('div');
			const config = markerConfig[category] || { 
				image: `reitaku-${id}-1.jpg`, 
				size: '40px', 
				radius: '50%',
				zIndex: index
			};

			Object.assign(customMarker.style, {
				backgroundImage: `url(images/pin.png)`,
				width: config.size,
				height: config.size,
				zIndex: config.zIndex || index,
				backgroundSize: 'cover',
				cursor: 'pointer',
			});

			const marker = new mapboxgl.Marker({ element: customMarker })
				.setLngLat([parseFloat(lon), parseFloat(lat)])
				.addTo(map);

			markers.push(marker);
			customMarker.title = currentLanguage === 'japanese' ? jName : eName;

			marker.getElement().addEventListener('click', () => {
				// If same marker is clicked again, do nothing
				if (lastClickedMarker === marker) {
					document.getElementById('info').innerHTML = 'マーカーをクリックまたはタップして詳細を表示';
					lastClickedMarker = null;
				} else {
					const arrows = numphotos > 1 ? `
						<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
						<a class="next" onclick="plusSlides(1)">&#10095;</a>
					` : '';
					
					document.getElementById('info').innerHTML = `
						<h2>${currentLanguage === 'japanese' ? jName : eName}</h2>
						<p>${currentLanguage === 'japanese' ? jDescription : eDescription}</p>
						<a href="${link}" target="_blank">${linkname}</a>
						<div class="slideshow-container">
							${rphotos}
							${arrows}
						</div>
					`;
					lastClickedMarker = marker;
					showSlides(1);  // Reset to first slide when marker is clicked
				}

				currentMarkerId = id;
				const leftPanel = document.getElementById('left-panel');
				const mapElement = document.getElementById('map');				
				
				// Reset slide index when new marker is clicked
				slideIndex = 1;
				
				// Remove closed class to show panel
				leftPanel.classList.remove('closed');
				document.body.classList.add('panel-open');
				
				// Adjust map height for mobile
				if (window.innerWidth <= 767) {
					setTimeout(() => {
						map.resize();
					}, 300);
				}
				
				const arrows = numphotos > 1 ? `
					<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
					<a class="next" onclick="plusSlides(1)">&#10095;</a>
				` : '';
				
				document.getElementById('info').innerHTML = `
					<h2>${currentLanguage === 'japanese' ? jName : eName}</h2>
					<p>${currentLanguage === 'japanese' ? jDescription : eDescription}</p>
					<a href="${link}" target="_blank">${linkname}</a>
					<div class="slideshow-container">
						${rphotos}
						${arrows}
					</div>
				`;
				lastClickedMarker = marker;
				showSlides(1);  // Reset to first slide when marker is clicked
			});
		});

		
	}
	// create a function that regenerates the left panel based on the current marker id
	function regenerateLeftPanel() {
		// find the row that matches the current marker id
		const row = rows.find(row => row[0] === currentMarkerId);
		if (!row) return; // if no row is found, exit the function

		const [id, category, jName, eName, lat, lon, jDescription, eDescription,link,hashutagu,linkname,numphotos] = row;
		var rphotos = ''; // Object to store dynamically created variables

		for (let i = 1; i <= numphotos; i++) {
			rphotos+=`<div class="mySlides fade"><img src="images/reitaku-${id}-${i}.jpg" style="width:100%;height:350px;object-fit:cover"></div> `;
		}

		const arrows = numphotos > 1 ? `
			<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
			<a class="next" onclick="plusSlides(1)">&#10095;</a>
		` : '';

		const description = currentLanguage === 'japanese' ? jDescription : eDescription;
		const name = currentLanguage === 'japanese' ? jName : eName;
		document.getElementById('info').innerHTML = `
			<h2>${name}</h2>
			<p>${description}</p>
			<a href="${link}" target="_blank">${linkname}</a>
			<div class="slideshow-container">
				${rphotos}
				${arrows}
			</div>
			
		`;
		showSlides(1);  // Reset to first slide when panel is regenerated
	}

	// 初期設定;

	document.getElementById('threeDToggle').addEventListener('change', function(e) {
		if (e.target.checked) {
			addGeoJsonLayer();
		} else {
			removeGeoJsonLayer();
		}
	});

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

	// Add panel toggle functionality
	const leftPanel = document.getElementById('left-panel');
	const panelHandle = document.getElementById('panel-handle');

	panelHandle.addEventListener('click', () => {
		leftPanel.classList.toggle('closed');
		document.body.classList.toggle('panel-open');
		
		if (window.innerWidth <= 767) {
			setTimeout(() => {
				map.resize();
			}, 300);
		}
	});

	// Add tools panel toggle functionality
	const toolsToggle = document.getElementById('tools-toggle');
	const mapTools = document.getElementById('map-tools');
	
	toolsToggle.addEventListener('click', () => {
		const isVisible = mapTools.classList.contains('visible');
		mapTools.classList.toggle('visible');
		toolsToggle.textContent = currentLanguage === 'japanese' 
			? (isVisible ? '地図オプションを表示' : '地図オプションを非表示')
			: (isVisible ? 'Show map options' : 'Hide map options');
	});

}