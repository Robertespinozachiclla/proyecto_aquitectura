const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let bleCaracteristica = null;

async function conectarBLE() {
  try {
    document.getElementById("estado").innerText = "Buscando dispositivo...";
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: "ESP32_Cuarto_Prueba" }],
      optionalServices: [SERVICE_UUID]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    bleCaracteristica = await service.getCharacteristic(CHARACTERISTIC_UUID);

    document.getElementById("estado").innerText = "🟢 Estado: ¡Conectado con éxito!";
  } catch (error) {
    console.error(error);
    document.getElementById("estado").innerText = "🔴 Estado: Error al conectar";
  }
}

async function enviarComando(comando) {
  if (!bleCaracteristica) {
    alert("Primero debes hacer clic en 'Conectar a ESP32'");
    return;
  }
  try {
    let encoder = new TextEncoder();
    await bleCaracteristica.writeValue(encoder.encode(comando));
    console.log("Enviado: " + comando);
  } catch (error) {
    console.error("Error al enviar comando: ", error);
  }
}