let pyodide;
let lottieJson;
const statusElement = document.getElementById('status');

async function initPyodide() {
  statusElement.textContent = 'Завантаження Pyodide...';
  pyodide = await loadPyodide();
  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  await micropip.install('lottie'); // Встановлює останню версію lottie (pure Python)
  statusElement.textContent = 'Pyodide готовий!';
}

initPyodide();

async function convertToJson() {
  const file = document.getElementById('svgFile').files[0];
  if (!file) return alert('Завантажте SVG-файл');
  statusElement.textContent = 'Конвертація в JSON...';
  const reader = new FileReader();
  reader.onload = async (e) => {
    const svgContent = e.target.result;
    pyodide.FS.writeFile('/input.svg', svgContent);

    const animType = document.getElementById('animationType').value;
    const pythonCode = `
import lottie
from lottie.parsers.svg.importer import parse_svg_file
from lottie.objects.animations import KeyframeAnimation
from lottie.objects.layers import ShapeLayer

# Імпорт SVG
animation = parse_svg_file('/input.svg')

# Додати анімацію залежно від вибору
if not animation.layers:
  layer = ShapeLayer()
  animation.insert_layer(0, layer)
else:
  layer = animation.layers[0]

if '${animType}' == 'fade':
  layer.add_animation(KeyframeAnimation('opacity', [0, 1, 0], [0, 30, 60]))
elif '${animType}' == 'scale':
  layer.add_animation(KeyframeAnimation('scale', [[100,100], [150,150], [100,100]], [0, 30, 60]))
elif '${animType}' == 'rotate':
  layer.add_animation(KeyframeAnimation('rotation', [0, 360], [0, 60]))

animation.duration = 60  # 1 секунда (60 фреймів)
animation.framerate = 60

# Експорт в JSON str
import json
json_str = json.dumps(animation.to_dict())
json_str
    `;
    lottieJson = await pyodide.runPythonAsync(pythonCode);
    statusElement.textContent = 'JSON готовий!';
  };
  reader.readAsText(file);
}

function previewAnimation() {
  if (!lottieJson) return alert('Спочатку конвертуйте в JSON');
  const previewDiv = document.getElementById('preview');
  previewDiv.innerHTML = ''; // Очистити попередній
  lottie.loadAnimation({
    container: previewDiv,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: JSON.parse(lottieJson)
  });
}

async function convertToTgs() {
  if (!lottieJson) return alert('Спочатку конвертуйте в JSON');
  statusElement.textContent = 'Конвертація в TGS...';
  const pythonCode = `
import lottie
from lottie.exporters.tgs import export_tgs
import json

animation = lottie.Animation.from_dict(json.loads('${lottieJson.replace(/'/g, "\\'")}'))
export_tgs(animation, '/output.tgs')  # Експорт в TGS (gzip JSON)
with open('/output.tgs', 'rb') as f:
  data = f.read()
data  # Повернути байти
  `;
  const tgsBytes = await pyodide.runPythonAsync(pythonCode);
  const blob = new Blob([tgsBytes.toJs()], {type: 'application/gzip'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sticker.tgs';
  a.click();
  statusElement.textContent = 'TGS скачано!';
}
