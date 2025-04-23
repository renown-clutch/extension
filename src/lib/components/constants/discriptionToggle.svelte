<script>
  export let text = "Default Headline";
  export let warn = false;
</script>

<h2
  class={`text-xs leading-tight ${warn ? "text-yellow-600" : "text-slate-500"}`}
>
  {text}
</h2>
