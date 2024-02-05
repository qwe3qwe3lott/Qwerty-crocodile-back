export function* infinite() {
  let id = 1;
  while (true) {
    yield id++;
  }
}