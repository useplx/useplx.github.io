// O tema embutido do MkDocs nao conhece Mermaid, e sem pymdownx nao existe
// custom fence. Entao os blocos ```mermaid chegam ao HTML como
// <pre><code class="language-mermaid">; aqui eles viram <div class="mermaid">
// antes de o Mermaid rodar.
//
// textContent e lido depois do highlight.js ter passado: ele so injeta <span>,
// e textContent devolve a fonte limpa de qualquer forma.
(function () {
  function convert() {
    var blocks = document.querySelectorAll(
      "pre > code.language-mermaid, pre > code.mermaid"
    );
    Array.prototype.forEach.call(blocks, function (code) {
      var pre = code.parentNode;
      var div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = code.textContent;
      pre.parentNode.replaceChild(div, pre);
    });

    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        flowchart: { curve: "basis", useMaxWidth: true },
      });
      window.mermaid.run({ querySelector: ".mermaid" });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", convert);
  } else {
    convert();
  }
})();
