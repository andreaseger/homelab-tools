type Command = {
  kind: string;
  device: string;
  value?: number;
  seq: number;
};

const commandQueues = new Map<string, Command[]>();
let seqCounter = 0;

export function enqueueCommand(device: string, kind: string, value?: number): void {
  if (!commandQueues.has(device)) {
    commandQueues.set(device, []);
  }
  commandQueues.get(device)!.push({
    kind,
    device,
    value,
    seq: ++seqCounter,
  });
}

export function dequeueCommands(device: string, since: number): Command[] {
  const queue = commandQueues.get(device) ?? [];
  const result = queue.filter((cmd) => cmd.seq > since);
  return result;
}

export function serveCommands(device: string, since: number): Response {
  const commands = dequeueCommands(device, since);
  return Response.json({
    commands,
    nextSince: commands.length > 0 ? commands[commands.length - 1]!.seq : since,
  });
}
